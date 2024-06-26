const express = require("express");
const cors = require("cors");
const { createServer } = require("https");
const WebSocket = require("ws"); // Import WebSocket library
const fs = require("fs");
const { spawn } = require("child_process");

const app = express();
const server = createServer(
  {
    key: fs.readFileSync("./key.pem", "utf8"),
    cert: fs.readFileSync("./cert.pem", "utf8"),
  },
  app
);

const WebSocketServer = new WebSocket.Server({ server });

app.use(cors());

const dahuaPort = process.env.DAHUA_PORT || 554;

// WebSocket server handler
WebSocketServer.on("connection", function connection(ws) {
  console.log("Client connected");

  const ffmpeg = spawn("ffmpeg", [
    "-rtsp_transport",
    "tcp",
    "-i",
    `rtsp://admin:Henderson2016@cafe4you.dyndns.org:${dahuaPort}/cam/realmonitor?channel=1&subtype=0`,
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "baseline",
    "-b:v",
    "1500k",
    "-minrate",
    "1500k",
    "-maxrate",
    "1500k",
    "-bufsize",
    "1500k",
    "-g",
    "50",
    "-vf",
    "scale=-2:720",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-f",
    "flv",
    "pipe:1",
  ]);

  ffmpeg.stdout.on("data", function (data) {
    ws.send(data);
  });

  ffmpeg.stderr.on("data", function (data) {
    console.error("ffmpeg stderr:", data.toString());
  });

  ws.on("close", function () {
    console.log("Client disconnected");
    ffmpeg.kill("SIGINT");
  });
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
