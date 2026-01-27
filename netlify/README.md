# API Proxy

基于 Netlify Edge Functions 的反向代理服务，运行在全球边缘节点，低延迟高性能。

## 特性

- ✅ **全球边缘部署** - Netlify Edge Functions 运行在全球边缘节点
- ✅ **隐藏源 IP** - 完全隐藏客户端真实 IP 地址
- ✅ **流式传输** - 原生支持流式响应，无需手动缓冲
- ✅ **自动 CORS** - 自动处理跨域请求
- ✅ **零依赖** - 无需 Node.js，直接使用 Web API

## 部署方法

### 一键部署到 Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Anyuluo996/RoverProxy)

### 手动部署

1. Fork 本仓库
2. 在 Netlify 中导入仓库
3. 部署设置：
   - **Base directory**: `/`
   - **Publish directory**: `.` (留空)
   - **Build command**: 留空

## 文件结构

```
.
├── index.html                    # 首页（防止空目录）
├── netlify.toml                  # Netlify 配置
└── netlify/
    └── edge-functions/
        └── api-proxy.js          # Edge Function 代码
```

## 配置

修改 `netlify/edge-functions/api-proxy.js` 中的 `TARGET_HOST` 来更改目标服务器：

```javascript
const TARGET_HOST = "api.kurobbs.com"; // 改成你的目标域名
```

## 使用方法

部署后，直接访问路径即可代理到目标服务器：

| 代理地址 | 目标地址 |
|---------|---------|
| `https://你的站点.netlify.app/login` | `https://api.kurobbs.com/login` |
| `https://你的站点.netlify.app/api/user` | `https://api.kurobbs.com/api/user` |

路径完全一致，无需添加任何前缀！

## 注意事项

- 本代理仅供学习测试使用
- 请遵守目标服务器的使用条款
- 建议添加访问控制（密码、Token 等）防止滥用

## License

MIT
