const rtspRelay = require("rtsp-relay");
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
require("dotenv").config();

const app = express();
const server = createServer(app);

const { proxy, scriptUrl } = rtspRelay(app, server);

const corsOptions = {
  origin: "*", // Adjust according to your requirements
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

const dahuaPort = process.env.DAHUA_PORT || 80;

const handler = (channel) =>
  proxy({
    url: `rtsp://admin:Henderson2016@cafe4you.dyndns.org:${dahuaPort}/cam/realmonitor?channel=${channel}&subtype=0`,
    verbose: true,
    additionalFlags: ["-q", "1"],
    transport: "tcp",
  });

app.ws("/api/stream/:channel", (ws, req) => {
  setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 30000); // Send a ping every 30 seconds
  const { channel } = req.params;
  const wsHandler = handler(channel);
  ws.on("open", () => {
    console.log("WebSocket connection opened");
  });

  ws.on("message", (message) => {
    console.log("Received message:", message);
    if (typeof message !== "string") {
      console.log("Received binary data");
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
  wsHandler(ws, req);
});

app.get("/:id", (req, res) => {
  const id = req.params.id;
  const wsProtocol = process.env.NODE_ENV === "production" ? "wss" : "ws";
  res.send(`
    <div>
      <canvas id="canvas" style="width: 100vw; height: 100vh; display: block;"></canvas>
      <div id="player-controls">
        <button id="play-button">Play</button>
        <button id="pause-button">Pause</button>
        <button id="mute-button">Mute</button>
        <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="1">
      </div>
    </div>
    <style>
      body {
        padding: 0;
        margin: 0;
      }
      #player-controls {
        display: none;
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
        console.log('Player loaded:', player);

        playButton.addEventListener('click', () => {
          player.play();
          console.log('Play button clicked');
        });

        pauseButton.addEventListener('click', () => {
          player.pause();
          console.log('Pause button clicked');
        });

        muteButton.addEventListener('click', () => {
          player.volume = player.volume === 0 ? 1 : 0;
          volumeSlider.value = player.volume;
          console.log('Mute button clicked');
        });

        volumeSlider.addEventListener('input', () => {
          player.volume = parseFloat(volumeSlider.value);
          console.log('Volume changed:', player.volume);
        });
      });

      const ws = new WebSocket('${wsProtocol}://' + location.host + '/api/stream/${id}');
      ws.onopen = function() {
        console.log('WebSocket connection opened');
      };
      ws.onmessage = function(event) {
        console.log('WebSocket message received:', event.data);
      };
      ws.onerror = function(error) {
        console.error('WebSocket error:', error);
      };
      ws.onclose = function() {
        console.log('WebSocket connection closed');
      };
    </script>
  `);
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
