const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { WebSocketServer } = require("ws"); // Import WebSocketServer from 'ws' package
require("dotenv").config();
const fs = require("fs");

const key = fs.readFileSync("./key.pem", "utf8");
const cert = fs.readFileSync("./cert.pem", "utf8");

const app = express();
app.use(cors());

const server = createServer(app);

const wss = new WebSocketServer({ server }); // Create a WebSocket server

const dahuaPort = process.env.DAHUA_PORT || 80;

// Function to handle RTSP stream proxying
const handler = (channel) => {
  return {
    url: `rtsp://admin:Henderson2016@cafe4you.dyndns.org:${dahuaPort}/cam/realmonitor?channel=${channel}&subtype=0`,
    verbose: true, // Increase verbosity for more detailed logging
    additionalFlags: ["-q", "1"],
    transport: "tcp",
    onDisconnect: (client) => {
      console.log(`Client disconnected: ${client}`);
      // Optionally, handle reconnection logic here
    },
    onError: (error) => {
      console.error(`Stream error: ${error}`);
      // Optionally, handle stream errors here
    }
  };
};

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  const { id } = req.params;
  console.log(`WebSocket connection established for channel ${id}`);
  const wsHandler = handler(id);
  proxy(wsHandler)(ws, req); // Proxy the RTSP stream to the WebSocket connection
});


// HTTP route handler for serving the HTML page with the video player
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
      });
    </script>
  `);
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
