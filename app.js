const express = require("express");
const app = express();
var cors = require("cors");
const { proxy, scriptUrl } = require("rtsp-relay")(app);

const handler = proxy({
  url: `rtsp://admin:admin7365@anprdahua.dyndns.org:80/cam/realmonitor?channel=1&subtype=0`,
  // if your RTSP stream need credentials, include them in the URL as above
  verbose: false,
  transport: "tcp",
  additionalFlags: ["-vf", "scale=1440:1080"],
});

app.use(cors());
// the endpoint our RTSP uses
app.ws("/api/stream", handler);

// this is an example html page to view the stream
app.get("/", (req, res) =>
  res.send(`
  <div>
    <canvas id="canvas" style="width: 100vw; height: 100vh; display : block;margin:auto;"></canvas>
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
      // display: flex;
      display:none;
      justify-content: space-between;
      align-items: center;
      background-color: #333;
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
      url: 'wss://' + location.host + '/api/stream',
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
`)
);

const PORT = Number(process.env.PORT) || 3000;
const HOST = Number(process.env.HOST) || "0.0.0.0";

app.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
