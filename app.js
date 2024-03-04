const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

const cors = require("cors");
app.use(cors());

// Define the endpoint to proxy to
const targetUrl = "http://13.229.236.174:8889/proxied1";

// Create a proxy middleware instance
const proxy = createProxyMiddleware({
  target: targetUrl,
  changeOrigin: true, // Needed for virtual hosted sites
  pathRewrite: {
    [`^/proxied1/`]: "", // Remove the '/proxied1' from the request path
  },
});

// Use the proxy middleware for the specified endpoint
app.use("/", proxy);

// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
