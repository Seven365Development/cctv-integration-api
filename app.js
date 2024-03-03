const rtspRelay = require("rtsp-relay");
const express = require("express");
const { createServer } = require("http");

const app = express();
const server = createServer(app);

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
  document.addEventListener("DOMContentLoaded", function() {
    loadPlayer({
      url: 'wss://' + location.host + '/api/stream',
      canvas: document.getElementById('canvas'),
      onDisconnect: () => console.log("Connection lost!"),
    });
  });
</script>
`)
);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "localhost";

server.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
