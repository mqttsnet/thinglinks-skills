# 服务架构与分层

`thinglinks-ai-server` 是**只读诊断入口**:不修改数据、不向设备下发命令、不执行脚本。
服务标识 `thinglinks-ai-server`,网关路由 `/ai/**`。

## 模块

| 模块 | 放什么 |
| --- | --- |
| `thinglinks-ai-entity` | 工具返回值 `ai/vo/result/*ResultVO` |
| `thinglinks-ai-biz` | `ai/tool` 能力实现与工具目录。**看不见 MCP SDK**;另有几个只放 package-info 的预留包(见下) |
| `thinglinks-ai-biz-mcp` | `ai/mcp` MCP 协议适配。**唯一引入 MCP SDK 的模块** |
| `thinglinks-ai-controller` | 自检类 HTTP 端点 |
| `thinglinks-ai-facade` | 对外门面(当前为空,预留) |
| `thinglinks-ai-server` | 启动模块。**唯一同时依赖 base 与 system 两个 `cloud-impl` 的地方**,契约测试放这里 |

## 三层分工

```
ai/tool/catalog/  工具目录与调用收口,与协议无关
ai/tool/<域>/     能力实现,按产品视角分域(platform / iot),方法签名不含任何 MCP 类型
ai/vo/result/     工具返回值,白名单裁剪
ai/mcp/           MCP 协议适配。在独立模块 thinglinks-ai-biz-mcp 里
```

**为什么把 SDK 类型关进独立模块**:传输层从有状态换成无状态时,`ai/tool` 一行未改。
协议是会变的,能力不会 —— 这条边界让协议变更的影响面固定住。

原先靠「只在 `ai/mcp` 包里引 SDK」这条约定维持,现在**由 Maven 模块边界在编译期强制**:
`thinglinks-ai-biz` 的依赖里没有 MCP SDK,想在能力层引一个协议类型,编译就过不去。
约定靠自觉,模块边界不靠。

`ai/tool` 下按**能力域**分子包(`platform` 平台基础、`iot` 物联网),不按下游服务分。
模型看到的是能力,不是你的服务拆分;下游服务合并或拆分时,工具的组织方式不该跟着抖。

### 两个出口，一份目录

工具目录与协议适配分在两个模块，因为**将来会有第二个出口**:MCP Server 与控制台聊天台
共用同一批工具,名字、描述、入参 schema 只有一份。各自维护一份清单的话,
加了工具只在一边生效,而两边的表现差异极难归因。

`ai/tool/catalog`(在 `thinglinks-ai-biz`,无协议类型):

| 类 | 管什么 |
| --- | --- |
| `ToolCatalog` | 全部工具的唯一目录。**每个出口都从这里取,不允许各自维护清单** |
| `ToolDefinition` | 能力层与协议层之间的**唯一契约**:name / title / description / inputSchema / outputSchema / readOnly / 执行入口 |
| `ToolGroup` 的八个实现 | 一个能力域一组(`PlatformIdentity` / `PlatformOrg` / `PlatformAudit` / `IotDevice` / `IotMetric` / `IotRule` / `IotOta` / `IotView`) |
| `ToolInvoker` | 调用的统一收口:序列化、异常归类、度量。异常转成结果而不是抛出 |
| `ToolResult` | 一次调用的结果,与协议无关 |
| `ToolJson` | 返回值序列化配置(独立的 Jackson 2 实例,日期对齐平台格式) |
| `ToolArguments` | 入参读取。共用是因为**同一句话在不同工具上必须表现一致** |
| `ToolInstructions` | 工具编排说明,两个出口共用同一份 |
| `ToolOutputSchema` | 从 VO 反射生成出参 schema |

`ai/mcp`(在 `thinglinks-ai-biz-mcp`,唯一有 SDK 的地方):

| 类 | 管什么 |
| --- | --- |
| `McpServerConfiguration` | 装配。**不认识任何具体工具**,从 `ToolCatalog` 取全部条目 |
| `McpToolAdapter` | 把 `ToolDefinition` 转成 MCP 的 `SyncToolSpecification` |
| `McpOriginFilter` | Origin 校验 |
| `McpThingModelResource` | 物模型资源模板(工具之外的第二个协议原语) |

**加工具只碰所属的那个 `ToolGroup`**,装配层与适配层都不用动。

分组按**能力域**,与 `ai/tool` 的分包口径一致,不按下游服务分。

代价是多了一个静默失败面:`ToolCatalog` 注入的是 `List<ToolGroup>`,
**漏标 `@Component` 的那一组不会报错,只是不在列表里** —— 服务照常启动,
`tools/list` 里静默少几个工具。`ToolGroupScanningTest` 守着这条。

## 下游取数的分层约定

一条链路上有三个角色,职责不能混:

- **Service 只取数** —— 零脱敏、零 MCP 语义。它同时服务控制台,不该知道 MCP 的存在
- **Converter 做白名单裁剪与脱敏** —— 决定哪些字段能出去
- **Controller 与 boot-impl Facade 共用同一个 Converter** —— 两条部署路径的出参形状因此不会漂

cloud 部署走 HTTP 到下游 controller,boot 部署直调 facade 实现。共用 Converter 是让这两条路
产出同一个形状的唯一办法;各写各的,迟早有一边多带一个字段出去。

## 预留包

`ai/audit`(工具调用审计与租户用量)、`ai/auditor`(阈值体检器,纯 Java 不调模型)、
`ai/proposal`(动作草案:模型给出的变更先落草案,由人在原页面确认后才生效)。

`proposal` 这个包的存在本身是一条设计声明:**写操作的出路是草案 + 人确认,不是给模型开写权限。**
被问到「能不能帮我改一下」时,答案是给建议并指向控制台,不是找一个能写的接口。
