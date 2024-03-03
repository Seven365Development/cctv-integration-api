const rtspRelay = require("rtsp-relay");
const express = require("express");
const https = require("https");
const fs = require("fs");

const key = fs.readFileSync("./key.pem", "utf8");
const cert = fs.readFileSync("./cert.pem", "utf8");

const app = express();
const server = https.createServer({ key, cert }, app);

const { proxy, scriptUrl } = rtspRelay(app, server);

app.ws(
  "/api/stream",
  proxy({
    url: "rtsp://admin:admin7365@anprdahua.dyndns.org:80/cam/realmonitor?channel=1&subtype=0",
    // if your RTSP stream need credentials, include them in the URL as above
    verbose: false,
    transport: "tcp",
    additionalFlags: ["-vf", "scale=1440:1080"],
  })
);

app.get("/", (_, res) =>
  res.send(`
  <canvas id='canvas'></canvas>

  <script src='${scriptUrl}'></script>
  <script>
    loadPlayer({
      url: 'wss://' + location.host + '/api/stream',
      canvas: document.getElementById('canvas'),
      onDisconnect: () => console.log("Connection lost!"),
    });
  </script>
`)
);

const PORT = Number(process.env.PORT) || 3000;
const HOST = Number(process.env.HOST) || "0.0.0.0";

app.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
