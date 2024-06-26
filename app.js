const rtspRelay = require("rtsp-relay");
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { spawn } = require("child_process");
require("dotenv").config();
const fs = require("fs");

const key = fs.readFileSync("./key.pem", "utf8");
const cert = fs.readFileSync("./cert.pem", "utf8");
// const key = fs.readFileSync(
//   "/etc/letsencrypt/live/cctv-integration-api.seven365.com.sg/privkey.pem",
//   "utf8"
// );
// const cert = fs.readFileSync(
//   "/etc/letsencrypt/live/cctv-integration-api.seven365.com.sg/fullchain.pem",
//   "utf8"
// );

const app = express();
const server = createServer({ key, cert }, app);

const { proxy, scriptUrl } = rtspRelay(app, server);

app.use(cors());

const dahuaPort = process.env.DAHUA_PORT || 80;

const handler = (channel) => {
  return (ws, req) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      `rtsp://admin:Henderson2016@cafe4you.dyndns.org:${dahuaPort}/cam/realmonitor?channel=${channel}&subtype=0`,
      "-f",
      "mpegts",
      "-codec:v",
      "mpeg1video",
      "-codec:a",
      "mp2",
      "-b:v",
      "800k",
      "-r",
      "30",
      "-",
    ]);

    ffmpeg.stdout.on("data", (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    ffmpeg.stderr.on("data", (data) => {
      console.error(`FFmpeg stderr: ${data}`);
    });

    ffmpeg.on("close", (code) => {
      console.log(`FFmpeg exited with code ${code}`);
      ws.close();
    });

    ws.on("close", () => {
      ffmpeg.kill("SIGINT");
    });
  };
};

app.ws("/api/stream/:channel", (ws, req) => {
  const { channel } = req.params;
  const wsHandler = handler(channel);
  wsHandler(ws, req);
});

app.get("/:id", (req, res) => {
  const id = req.params.id;
  const wsProtocol = process.env.NODE_ENV === "production" ? "wss" : "ws";
  res.send(`
    <div>
      <canvas id="canvas" style="width: 100vw; height: 100vh; display: block;"></canvas>
    </div>
    <style>
      body {
        padding: 0;
        margin: 0;
      }
      #player-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #333;
        padding: 10px;
      }
      button {
        margin: 0 5px;
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        background-color: #3498db;
        color: white;
        cursor: pointer;
      }
      input[type="range"] {
        width: 100px;
        margin: 0 5px;
      }
    </style>
    <script src='${scriptUrl}'></script>
    <script>
      var playerPromise = loadPlayer({
        url: '${wsProtocol}://' + location.host + '/api/stream/${id}',
        canvas: document.getElementById('canvas'),
        audio: true
      });

      const playButton = document.getElementById('play-button');
      const pauseButton = document.getElementById('pause-button');
      const muteButton = document.getElementById('mute-button');
      const volumeSlider = document.getElementById('volume-slider');

      playerPromise.then(player => {
        playButton.addEventListener('click', () => {
          player.play();
        });

        pauseButton.addEventListener('click', () => {
          player.pause();
        });

        muteButton.addEventListener('click', () => {
          player.volume = player.volume === 0 ? 1 : 0;
          volumeSlider.value = player.volume;
        });

        volumeSlider.addEventListener('input', () => {
          player.volume = parseFloat(volumeSlider.value);
        });
      }).catch(error => {
        console.error('Failed to load player:', error);
      });
    </script>
  `);
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, () => {
  console.log(
    `Server is running on https://${HOST}:${PORT} and DAHUA PORT is running on ${dahuaPort}`
  );
});
