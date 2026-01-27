const express = require('./netlify/node_modules/express');
const https = require('https');

const app = express();
const TARGET_HOST = "api.kurobbs.com";

app.use(express.json());

app.all(/(.*)/, async (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  try {
    const headers = { ...req.headers, host: TARGET_HOST };
    delete headers.connection;
    delete headers["content-length"];

    const response = await fetch(`https://${TARGET_HOST}${req.url}`, {
      method: req.method,
      headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined,
    });

    console.log(`Response status: ${response.status}`);
    const data = await response.text();
    console.log(`Response body: ${data.substring(0, 200)}...`);

    res.status(response.status).send(data);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Test server running on http://localhost:3000');
  console.log(`Proxy target: ${TARGET_HOST}`);
});
