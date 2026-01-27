// 简单的测试 Edge Function
export default async (request, context) => {
  return new Response("Edge Function is working! Requested: " + new URL(request.url).pathname, {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
};

export const config = {
  path: "/*"
};
