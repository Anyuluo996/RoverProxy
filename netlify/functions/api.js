// functions/api.js
const express = require("express");
const https = require("https");
const serverless = require("serverless-http"); // 引入 serverless-http

const app = express();
const TARGET_HOST = "api.kurobbs.com";

console.log("=== Netlify Function Started ===");
console.log("TARGET_HOST:", TARGET_HOST);

// 获取原始请求体 - 只处理有请求体的请求
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // GET/HEAD 请求没有 body，直接跳过
  if (req.method === 'GET' || req.method === 'HEAD') {
    req.rawBody = Buffer.alloc(0);
    console.log("No body for GET/HEAD request");
    return next();
  }

  const contentLength = parseInt(req.headers['content-length'], 10);
  if (!contentLength || contentLength === 0) {
    req.rawBody = Buffer.alloc(0);
    console.log("No content-length, skipping body");
    return next();
  }

  console.log("Content-Length:", contentLength);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  let body = [];
  let received = 0;

  req.on("data", (chunk) => {
    body.push(chunk);
    received += chunk.length;
    console.log("Received chunk, size:", chunk.length, "total:", received);
    // 防止body过大
    if (received > 5 * 1024 * 1024) {
      console.log("Body too large, destroying");
      req.destroy();
    }
  });

  req.on("end", () => {
    req.rawBody = Buffer.concat(body);
    console.log("Total body size:", req.rawBody.length);
    next();
  });

  req.on("error", (err) => {
    console.error("Request error:", err.message);
    if (!res.headersSent) {
      res.status(400).json({ error: "请求读取失败" });
    }
  });
});

// 处理OPTIONS预检请求 - 使用正则匹配
app.options(/(.*)/, (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Max-Age", "86400");
  res.status(200).send();
});

// 代理所有请求
app.all(/(.*)/, (req, res) => {
  // 注意：在 Netlify Function 中，originalUrl 包含了 /.netlify/functions/api 前缀
  // 我们通常只关心路径部分，或者直接透传
  const originalUrl = req.url; 

  // 复制headers并设置目标主机
  const headers = { ...req.headers, host: TARGET_HOST };
  delete headers.connection;
  delete headers["content-length"]; // 删除长度，让 https.request 重新计算，防止出错

  // 发送请求
  const proxyReq = https.request(
    {
      hostname: TARGET_HOST,
      port: 443,
      path: originalUrl,
      method: req.method,
      headers: headers,
    },
    (proxyRes) => {
      // 设置CORS
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

      // 复制响应头
      Object.keys(proxyRes.headers).forEach((key) => {
        // 移除可能导致问题的 header
        if (key !== 'connection' && key !== 'transfer-encoding') {
             res.header(key, proxyRes.headers[key]);
        }
      });

      res.status(proxyRes.statusCode);
      
      // 注意：Serverless 环境下 pipe 有时会有缓冲问题，但 serverless-http 通常处理得很好
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (err) => {
    console.error(`ERR: ${err.message}`);
    // 防止 headers 已经发送导致报错
    if (!res.headersSent) {
        res.status(500).json({ error: "代理失败" });
    }
  });

  // 发送请求体
  if (req.method !== "GET" && req.method !== "HEAD" && req.rawBody?.length > 0) {
    proxyReq.write(req.rawBody);
  }

  proxyReq.end();
});

// 移除 app.listen，导出 handler
module.exports.handler = serverless(app);