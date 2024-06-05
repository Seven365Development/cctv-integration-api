const rtspRelay = require("rtsp-relay");
const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = createServer(app);

const { proxy, scriptUrl } = rtspRelay(app, server);

app.use(cors());
const dahuaPort = process.env.DAHUA_PORT || 80;
const handler = (channel) =>
	proxy({
		url: `rtsp://admin:Henderson2016@cafe4you.dyndns.org:${dahuaPort}/cam/realmonitor?channel=${channel}&subtype=0`,
		// if your RTSP stream need credentials, include them in the URL as above
		verbose: false,
		additionalFlags: ["-q", "1"],
		transport: "tcp",
	});
app.ws("/api/stream/:channel", (ws, req) => {
	const { channel } = req.params;
	const wsHandler = handler(channel);
	wsHandler(ws, req);
});

app.get("/:id", (req, res) => {
	const id = req.params.id;
	const ws = process.env.NODE_ENV === "production" ? "wss" : "ws";
	res.send(`
    <div>
      <canvas id="canvas" style="width: 100vw; height: 100vh; display : block;"></canvas>
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
        display:none;
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
        url: '${ws}://' + location.host + '/api/stream/${id}',
        canvas: document.getElementById('canvas'),
        audio : true
      });

      
      const playButton = document.getElementById('play-button');
      const pauseButton = document.getElementById('pause-button');
      const muteButton = document.getElementById('mute-button');
      const volumeSlider = document.getElementById('volume-slider');
      playerPromise.then(player =>{
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
      })

    </script>
  `);
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "localhost";

server.listen(PORT, () => {
	console.log(`Server is running on http://${HOST}:${PORT}`);
});
