const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const { spawn } = require("child_process");
require("dotenv").config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const ws = new WebSocket.Server({ server });

const dahuaPort = process.env.DAHUA_PORT || 554;

const createFFmpegProcess = (channel) => {
  console.log(`Creating FFmpeg process for channel ${channel}`);
  return spawn("ffmpeg", [
    "-rtsp_transport", "tcp",
    "-i", `rtsp://admin:Henderson2016@cafe4you.dyndns.org:${dahuaPort}/cam/realmonitor?channel=${channel}&subtype=0`,
    "-vf", "fps=25", // Adjust frame rate
    "-pix_fmt", "yuv420p", // Set pixel format
    "-f", "mpegts",
    "-codec:v", "mpeg1video",
    "-codec:a", "mp2",
    "-"
  ]);
};

ws.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const channel = url.pathname.split("/").pop();
  
  const ffmpeg = createFFmpegProcess(channel);

  ffmpeg.stdout.on("data", (data) => {
    console.log(`Sending data for channel ${channel}`);
    ws.send(data);
  });

  ffmpeg.stderr.on("data", (data) => {
    console.error(`FFmpeg error for channel ${channel}: ${data}`);
  });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code} for channel ${channel}`);
    ws.close();
  });

  ws.on("close", () => {
    console.log(`WebSocket closed for channel ${channel}`);
    ffmpeg.kill("SIGINT");
  });
});

app.get("/:id", (req, res) => {
  const id = req.params.id;
  // const wsProtocol = process.env.NODE_ENV === "production" ? "wss" : "ws";
  const wsProtocol = "ws";
  res.send(`
    <div>
      <canvas id="canvas" style="width: 100vw; height: 100vh; display: block;"></canvas>
    </div>
    <script>
      const ws = new WebSocket('${wsProtocol}://' + location.host + '/api/stream/${id}');
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      ws.onmessage = (event) => {
        img.src = URL.createObjectURL(event.data);
      };

      ws.onopen = () => {
        console.log("WebSocket connection opened for channel ${id}");
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed for channel ${id}");
      };

      ws.onerror = (error) => {
        console.error("WebSocket error for channel ${id}: ", error);
      };
    </script>
  `);
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
