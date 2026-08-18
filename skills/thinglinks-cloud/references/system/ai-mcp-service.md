# AI 服务与 MCP 接入链路

`thinglinks-ai` 是 cloud 仓里的一个平台级服务:把平台与物联网数据以 MCP 工具的形式开放给
外部 AI 客户端。**只读** —— 不修改数据、不下发命令、不执行脚本。

服务标识 `thinglinks-ai-server`,端口 `18800`,网关路由 `/ai/**`,对外端点 `/ai/mcp`
(网关 `StripPrefix=1` 后服务侧为 `/mcp`)。

> 本篇讲的是**平台侧要为它做什么**:网关、凭证、下游 inner 接口。
> 「模型该怎么用这些工具」以及 `thinglinks-ai` 模块内部怎么加工具,见
> [`thinglinks-ai`](../../../thinglinks-ai/) skill。

## 模块

| 模块 | 放什么 |
| --- | --- |
| `thinglinks-ai-entity` | 工具返回值 `ai/vo/result/*ResultVO` |
| `thinglinks-ai-biz` | `ai/mcp` 协议适配、`ai/tool` 能力实现、`ai/skill` 排查手册注册表 |
| `thinglinks-ai-controller` | 自检类端点 |
| `thinglinks-ai-server` | 启动模块,**唯一同时依赖 base 与 system 两个 `cloud-impl` 的地方** |

## 请求链路

```
MCP 客户端  Authorization: Bearer tl_mcp_xxx
      ↓
网关 McpCredentialFilter (order -1050,早于 TOKEN 的 -1000)
      剥掉调用方全部身份 header → 调 system 校验凭证 → 用可信值重写
      ↓  之后与普通 Web 请求完全一致,下游零改动
TokenContextFilter → HeaderThreadLocalInterceptor → ContextUtil
      ↓
DsThreadProcessor 切租户库 + 租户列拦截器拼 created_org_id
      ↓
ai/tool → Facade → 下游 /inner/mcp/<域>
```

**为什么要先剥再写**:客户端可以任意伪造租户与用户 header。过滤器把 tenantId、applicationId、
userId、employeeId、公司/部门、clientId、token 这一组全部丢弃,只用凭证还原出来的值重写 ——
下游因此可以继续无条件信任 header,不必为 MCP 这条链路做任何特判。

**为什么排在 token 过滤器之前**:MCP 客户端不持有 Sa-Token 会话,只带凭证。
排在后面会先被令牌校验挡下。

## 凭证

凭证表在 system 侧,存的是 hash 与密文,不存明文;身份解析复用登录那套。
校验走 `DefMcpCredentialInnerController`。

**降级必须与鉴权失败分流**:熔断降级与远程异常都收敛成超时码,此时校验根本没跑成。
报 401 会让用户去重置一把完全有效的凭证 —— 所以 401(凭证问题,带 `WWW-Authenticate`)
与 503(校验链路不可用,带 `Retry-After`)分开。这个坑在这条链路上踩过一次。

出口 IP 不做缓存键:MCP 客户端的出口 IP 常随网络切换变动,缓存会退化成基本不命中。

## 下游服务要提供什么

取数一律走 `/inner/**`,且**必须落在各服务的 MCP 专用 controller 上**:

| 服务 | controller |
| --- | --- |
| link | `DeviceMcpInnerController`、`ProductMcpInnerController` |
| rule | `RuleMcpInnerController` |
| view | `ViewProjectMcpInnerController` |
| system | `DefMcpCredentialInnerController`(凭证校验,不是业务取数) |

**不要挂到 `/inner/deviceOpen` 这类既有 controller 上**:那组带 `ByNorthbound` 后缀的端点是
openapi 的北向接口,出参形状被外部集成方钉住,MCP 想加字段就得跟他们协调。
反过来 **MCP 专用端点不加 `ByNorthbound` 后缀**,那个后缀只留给 openapi 依赖的接口。

### 产物命名与分层

为 MCP 新增的产物统一命名 `XxxMcpResultVO` + `XxxMcpConverter`。它们和控制台 VO 混在同一个包里,
**名字必须自己会说话** —— 在那里加一个字段等于直接把数据发给模型,而做这个改动的人多半不知道
这个类被 MCP 用着。

- **Service 只取数**:零脱敏、零 MCP 语义。它同时服务控制台,不该知道 MCP 的存在
- **Converter 做白名单裁剪与脱敏**
- **Controller 与 boot-impl Facade 共用同一个 Converter**:两条部署路径的出参形状因此不会漂

### 数据权限要显式开

`DataScopeInnerInterceptor` 按**前端页面路径**查配置,而 MCP 请求的 path 恒为 `/ai/mcp`、
`applicationId` 已被网关剥离 —— 查不到配置就不拼 where 条件,即**放行**而非拒绝。

所以 inner controller 里要显式 `DataScopeHelper.startDataScope("<表名>")`,
**一次只对一张主表生效**,跨两张表要分别开。

**走缓存的链路上它无效**:设备详情、影子这类读 Redis 缓存的路径没有 MyBatis 查询可拼 where,
组织级收窄要靠前置的设备详情查询兜住。

租户级隔离不受影响,由数据源切换保证。

### 字典字段要回显

不回显模型只拿到编码 `0` / `1`。controller 与 boot-impl 两条路径都要处理;
MCP 出参刻意不实现回显 VO 接口,采用就地替换。

## 网关侧

`/inner/**` 在网关拒绝清单内,只能服务间直连 —— 为 MCP 新增 inner 接口不会多出对外可达路径。
`/ai/**` 路由与 `McpConstant.MCP_PATH`、`McpServerConfiguration.MCP_ENDPOINT` 三处要一致,
只改一处的症状是客户端连不上**且没有任何报错**。
