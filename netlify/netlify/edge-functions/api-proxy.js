// netlify/edge-functions/api-proxy.js
// Netlify Edge Function - 基于 Deno + V8 引擎，运行在边缘节点

export default async (request, context) => {
  const TARGET_HOST = "api.kurobbs.com";
  const url = new URL(request.url);

  console.log(`[Edge] Incoming: ${request.method} ${url.pathname}`);

  // 1. 处理 OPTIONS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*", // 允许所有 Header，防止跨域报错
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 2. 构建目标 URL
  url.protocol = "https:";
  url.hostname = TARGET_HOST;
  url.port = "443";

  // 3. 构建请求头
  const newHeaders = new Headers();

  // 复制原始请求头，但排除 Netlify 自动添加的和敏感的头
  const blockedHeaders = ["host", "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"];

  for (const [key, value] of request.headers.entries()) {
    if (!blockedHeaders.includes(key.toLowerCase()) && !key.startsWith("x-nf-")) {
      newHeaders.set(key, value);
    }
  }

  // 强制设置 Host
  newHeaders.set("Host", TARGET_HOST);
  // 伪装 User-Agent (可选，防止对方屏蔽空 UA)
  if (!newHeaders.get("user-agent")) {
    newHeaders.set("User-Agent", "Mozilla/5.0 (compatible; NetlifyProxy/1.0)");
  }

  try {
    const response = await fetch(url, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "manual",
    });

    // 4. 处理响应头
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    // 移除可能破坏显示的响应头
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("x-frame-options");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (err) {
    console.error("Proxy Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
