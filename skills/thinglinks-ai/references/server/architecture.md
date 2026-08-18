# 服务架构与分层

`thinglinks-ai-server` 是**只读诊断入口**:不修改数据、不向设备下发命令、不执行脚本。
服务标识 `thinglinks-ai-server`,网关路由 `/ai/**`。

## 模块

| 模块 | 放什么 |
| --- | --- |
| `thinglinks-ai-entity` | 工具返回值 `ai/vo/result/*ResultVO` |
| `thinglinks-ai-biz` | `ai/mcp` 协议适配、`ai/tool` 能力实现、`ai/skill` 手册注册表 |
| `thinglinks-ai-controller` | 自检类 HTTP 端点 |
| `thinglinks-ai-facade` | 对外门面(当前为空,预留) |
| `thinglinks-ai-server` | 启动模块。**唯一同时依赖 base 与 system 两个 `cloud-impl` 的地方**,契约测试放这里 |

## 三层分工

```
ai/mcp/     协议适配。McpServerConfiguration 是唯一出现 MCP SDK 类型的地方
ai/tool/    能力实现,按产品视角分域(platform / iot),方法签名不含任何 MCP 类型
ai/vo/result/  工具返回值,白名单裁剪
```

**为什么把 SDK 类型关在 `ai/mcp` 一个包里**:传输层从有状态换成无状态时,`ai/tool` 一行未改。
协议是会变的,能力不会 —— 这条边界让协议变更的影响面固定在一个包内。

`ai/tool` 下按**能力域**分子包(`platform` 平台基础、`iot` 物联网),不按下游服务分。
模型看到的是能力,不是你的服务拆分;下游服务合并或拆分时,工具的组织方式不该跟着抖。

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
