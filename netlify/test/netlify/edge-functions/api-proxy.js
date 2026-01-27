// netlify/edge-functions/api-proxy.js
// Netlify Edge Function - 基于 Deno + V8 引擎，运行在边缘节点

export default async (request, context) => {
  const TARGET_HOST = "api.kurobbs.com";
  const url = new URL(request.url);

  console.log(`[Edge] Received ${request.method} request for: ${url.pathname}`);

  // 1. 处理 CORS 预检请求 (OPTIONS)
  if (request.method === "OPTIONS") {
    console.log("[Edge] Handling OPTIONS preflight request");
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 2. 构建目标 URL
  // 将当前请求的 host 替换为目标 host，保持路径(pathname)和参数(search)不变
  url.protocol = "https:";
  url.hostname = TARGET_HOST;
  url.port = "443";

  console.log(`[Edge] Proxying ${request.method} to: ${url.toString()}`);

  // 3. 准备请求头 - 隐藏源IP和代理信息
  const newHeaders = new Headers();
  newHeaders.set("Host", TARGET_HOST);

  // 只保留必要的头部，移除所有可能泄露真实IP和代理信息的头部
  const safeHeaders = [
    "content-type",
    "content-length",
    "accept",
    "accept-language",
    "accept-encoding",
    "authorization",
    "user-agent",
    "cookie"
  ];

  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (safeHeaders.includes(lowerKey)) {
      newHeaders.set(key, value);
    }
  }

  // 移除可能泄露IP的头部（包括上面可能误添加的）
  const headersToRemove = [
    "Referer",
    "Origin",
    "X-Forwarded-For",
    "X-Real-IP",
    "X-Forwarded-Host",
    "X-Forwarded-Proto",
    "X-Forwarded-Server",
    "Via",
    "Forwarded",
    "CF-Connecting-IP",
    "CF-IPCountry",
    "True-Client-IP",
    "CF-Ray",
    "X-Client-IP",
    "Client-IP"
  ];

  headersToRemove.forEach(header => {
    newHeaders.delete(header);
  });

  try {
    // 4. 发起转发请求
    const response = await fetch(url, {
      method: request.method,
      headers: newHeaders,
      body: request.body, // 直接透传流，无需手动缓冲，性能极高
      redirect: "manual", // 让客户端处理重定向
    });

    console.log(`[Edge] Response status: ${response.status}`);

    // 5. 处理响应头 (添加 CORS)
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    // 6. 返回响应
    // response.body 也是流，直接 pipe 回去
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error("[Edge] Proxy Error:", err);
    return new Response(JSON.stringify({ error: "代理请求失败", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// 配置 Edge Function 的路由
export const config = {
  path: "/*"
};
