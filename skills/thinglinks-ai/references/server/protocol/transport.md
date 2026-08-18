# 传输与端点

## 为什么用无状态传输

工具全是只读查询,不需要服务端主动推送。有状态时会话是实例内存态,多副本下要让网关按
`Mcp-Session-Id` 做一致性哈希,滚动更新与缩容会断会话 —— 为一组只读查询付这个代价不值。

改回有状态只需在 `ai/mcp` 内换成 `WebMvcStreamableServerTransportProvider`,本包之外无需改动。
这正是「SDK 类型只出现在 `ai/mcp`」那条约定换来的:协议选型是可逆的。

客户端侧对应配置是 **Streamable HTTP**,不是 SSE。

## 端点路径有三处,必须同时改

| 位置 | 值 |
| --- | --- |
| 对外(网关) | `/ai/mcp` |
| 服务侧(`StripPrefix=1` 之后) | `/mcp` |
| 常量 | `McpConstant.MCP_PATH`、`McpServerConfiguration.MCP_ENDPOINT`、网关路由 |

只改其中一处,客户端连不上,**且没有任何报错** —— 请求打在一个不存在的路径上,
服务日志干净,客户端只显示连接失败。这是排查成本最高的一类改动,所以三处一起改。

## SDK 版本

MCP SDK 版本在 `thinglinks-dependencies-parent` 的 `mcp-sdk.version`,通过官方 `mcp-bom` 统一管理。
子构件必须同版本发布,**错配的症状是运行期 `NoSuchMethodError` 而不是编译失败**,
所以不要逐个钉子构件版本,只动 bom。

## 已知偏离

`tl_mcp_*` 静态长效 Bearer 偏离规范推荐的 OAuth 2.1。规范里鉴权是 `OPTIONAL`,故非违规。
这是有意选择:静态 key 是所有 MCP 客户端配置的最小公分母,换 OAuth 会把「配一行 key」
变成「跑一遍授权流」。退出路径是官方的 OAuth Client Credentials 扩展。
