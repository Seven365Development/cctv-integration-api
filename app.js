const rtspRelay = require("rtsp-relay");
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const WebSocket = require("ws"); // Import WebSocket library
require("dotenv").config();
const fs = require("fs");

const key = fs.readFileSync("./key.pem", "utf8");
const cert = fs.readFileSync("./cert.pem", "utf8");

const app = express();
const server = createServer({ key, cert }, app);

const { proxy, scriptUrl } = rtspRelay(app, server);

app.use(cors());

const dahuaPort = process.env.DAHUA_PORT || 80;

// Define handler function with WebSocket handling
const handler = (channel) => {
  let wsClients = [];

  const connectToStream = () => {
    proxy({
      url: `rtsp://admin:Henderson2016@cafe4you.dyndns.org:${dahuaPort}/cam/realmonitor?channel=${channel}&subtype=0`,
      verbose: true,
      additionalFlags: ["-q", "1"],
      transport: "tcp",
      onDisconnect: (client) => {
        console.log(`Client disconnected: ${client}`);
        // Schedule a reconnect after some delay (e.g., 5 seconds)
        setTimeout(connectToStream, 5000);
      },
      onError: (error) => {
        console.error(`Stream error: ${error}`);
        console.log(
          `Stream URL: rtsp://admin:Henderson2016@cafe4you.dyndns.org:${dahuaPort}/cam/realmonitor?channel=${channel}&subtype=0`
        );
        // Log the error for troubleshooting
        fs.appendFileSync(
          "stream_errors.log",
          `${new Date().toISOString()} - Stream Error: ${error}\n`
        );
        // Schedule a reconnect immediately
        connectToStream();
      },
      onData: (data) => {
        // Send data to all connected WebSocket clients
        wsClients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      },
    });
  };

  connectToStream();

  return (ws, req) => {
    // Add WebSocket client to the array
    wsClients.push(ws);

    ws.on("close", () => {
      // Remove WebSocket client from the array on close
      wsClients = wsClients.filter((client) => client !== ws);
    });

    // Optionally, handle WebSocket messages from clients
    ws.on("message", (message) => {
      console.log(`Received message from client: ${message}`);
      // Handle incoming WebSocket messages if needed
    });
  };
};

// WebSocket endpoint
app.ws("/api/stream/:channel", (ws, req) => {
  const { channel } = req.params;
  const wsHandler = handler(channel);
  wsHandler(ws, req);
});

// HTTP endpoint to serve the HTML player
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
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
