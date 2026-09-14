---
name: thinglinks-edge
description: >
  Use when onboarding devices through ThingLinks Edge, configuring Node-RED protocol templates,
  mapping PLC or meter points to Cloud models, diagnosing missing data, offline devices or
  uncertain commands, or maintaining Edge instances, packages, deployments and backups.
  Trigger on ThingLinks Edge, 边缘网关, 设备接入, 点表, 试读, Modbus, OPC UA, S7,
  采集流程, 断网补传, 云边状态不一致, and Edge 配置/排障/升级/恢复.
  Cloud-only Java handlers and video integration belong to thinglinks-cloud.
---

# ThingLinks Edge · 设备接入与现场维护

帮助用户把现场设备接入 ThingLinks，并沿证据定位故障、完成配置与维护。先解决用户当前卡住的一步，再按需展开协议或源码细节。

## 工作方式

1. **识别任务和对象。** 新接入、已有设备排障、控制、部署维护或开发；优先从现有页面/工具读取实例、设备、版本和故障时间，只追问会改变下一步的缺项。
2. **选择最短路径。** 新设备先确认一个真实点；故障先查第一段异常；简单部署先给必要配置。不要让用户先理解 Topic、类名或整套基础设施。
3. **对齐云边身份。** 现场设备地址、Edge 实例、本地设备标识、Cloud 子设备标识及网关归属分别核对；本地登记不等于 Cloud 注册。
4. **读取相关专题并执行授权内的动作。** 有 Edge 页面/宿主访问就读实际状态；有 Cloud MCP 就按 `thinglinks-ai` 查询。没有工具时给具体页面、字段、预期结果，不声称已操作。此 skill 本身不提供 Edge MCP 或设备执行权限。
5. **验证并交代结果。** 输出当前结论、支持它的字段/时间、建议或已做的最小改动、验证结果和剩余断点。一般只给下一步所需信息；完整交接使用信息表。

## 任务路由 / References Index

| 用户需要 | 读取 | 完成时应得到 |
| --- | --- | --- |
| 电表/PLC/传感器接上云、填写点位 | [onboarding.md](references/onboarding.md) | 可核对的配置、一个真实值、持续采集及云端证据 |
| 选协议、寄存器/字节序/NodeId/控制范围 | [protocols.md](references/protocols.md) | 当前可用路径、必填参数与具体限制 |
| 云连接、物模型不匹配、影子/历史没数据 | [cloud-integration.md](references/cloud-integration.md) | 网关/子设备/绑定版本对齐及云边证据 |
| 采集正常但离线、断连不下线、多来源 | [presence.md](references/presence.md) | 现场状态、来源状态、云状态分开判定 |
| 命令超时、没生效、重复执行、回执 | [commands.md](references/commands.md) | 命令在哪一段、是否确实执行、可否重试 |
| 部署、节点安装、编辑器、升级、备份恢复 | [operations.md](references/operations.md) | 最小操作步骤、影响范围、恢复验证 |
| 只给现象、需要定位责任层及维护措施 | [troubleshooting.md](references/troubleshooting.md) | 有顺序的检查、证据和下一步 |
| 修改 Edge 源码、扩协议、验证实现 | [development.md](references/development.md) | 源码入口、模块边界与相应验证 |

## 产品分工

```text
现场设备 ⇄ Node-RED 协议节点/流程 ⇄ Edge Manager ⇄ ThingLinks Cloud
             读写与解析              台账、聚合、缓存    身份、物模型、状态
             模板生成                命令与状态同步      影子、历史与规则
```

Node-RED 实例是独立容器；停止 Manager 不等于停止采集实例。Edge 控制台位于 Edge 仓的 `apps/web-console`，不套用 Cloud Vben 控制台的组件规范。Cloud 中名为 `ProtocolEdgeAdapter` 的类属于云端上行归一，不是这个 Edge 产品。

## 容易改变判断的约束

- 协议组件已入库、已批准、已安装、已加载、设备读写成功、Cloud 接收成功是不同状态。
- 新内置 Modbus-TCP 模板当前只开放采集；OPC UA 兼容采集与安全控制分开判断；候选协议不写成已支持。
- 上报按子设备**绑定版本**映射；Cloud 产品当前版本不一定是该版本。不要把网关默认模型给子设备使用。
- `/datas` 不代替 `/topo/update`。有效实时采样、流程续约和历史补传不能混用为在线证据。
- 设备写入结果未知时不自动重写；可以独立重试回执。Cloud 接收回执不等于原下发记录已经更新。
- 管理更新不会自动改写已部署流程，也不会让普通 Node-RED 镜像自动获得原生兼容构件。
- 保留现有实例、密钥、绑定和数据；改变现场写入、停机或恢复范围前先明确具体对象及影响，已有授权内继续，不反复索要确认。

## 与 Cloud / AI 技能协作

- 现场接入和 Edge 配置以本 skill 为主。Cloud 数据工具可用时，按 [`thinglinks-ai`](../thinglinks-ai/SKILL.md) 的字段与只读约定查询；这些工具不创建设备、不配置 Edge、不下发命令。
- 云端处理与接口问题转 [`thinglinks-cloud` 云边协同](../thinglinks-cloud/references/iot/edge-integration.md)。只在进入云端源码排障时加载其 Java 实现专题。
- 仓库定位看 [`thinglinks-workspace`](../thinglinks-workspace/SKILL.md)。GB28181/ONVIF 等视频接入走 Cloud 视频域。
- 配套技能未安装时，仍可按本 skill 完成 Edge 引导；缺少 Cloud 工具则使用控制台核对，不虚构工具或接口结果。

## 可复用材料与维护

- [设备接入信息表](assets/device-intake.md)：汇总已知值、待确认字段、配置来源和逐段验收；不要求用户重新填写已获取的信息。
- [行为用例](evals/README.md)：检验接入、诊断、配置和维护决策，区别于产品运行测试。

本版核对日期：2026-09-14，依据 Edge 与旗舰 Cloud 当前工作树。运行中的镜像、流程修订和已发布制品需另查；这些资料不代表所有协议、物理设备或历史实例已经验收。
