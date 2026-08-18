---
name: thinglinks-ai
description: >
  Use whenever an agent is talking to the ThingLinks IoT platform through its MCP server
  (thinglinks-ai-server, tools like get_device, get_device_shadow, query_timeseries,
  get_metric_stats, compare_across_devices, list_rule_conditions, get_alarm_records,
  get_operation_audit, who_has_permission) — it decides which tool to pick, in what order,
  what the returned fields actually mean, and what must never be claimed. Load it for device
  diagnosis (设备离线 / 数据不更新 / 设备为什么没上报), alarm and threshold review
  (告警误报 / 阈值配错量纲 / 规则不触发), OTA and version questions (升级成功了吗 /
  设备都在什么版本), metric baselines and cross-device comparison, permission and audit
  lookups (我能不能 / 谁改的 / 谁有这个权限), and for building or extending the MCP server
  itself (加一个工具 / outputSchema / inner 接口 / 凭证接入). Also use it when a question
  looks answerable but is not — 告警通知发没发、改成了什么值、哪个大屏在看某台设备 —
  those have documented answers here. Trigger on ThingLinks MCP, tl_mcp credentials,
  设备诊断, 告警复核, 物模型量纲, 数据范围, even when the user does not name a tool.
---

# ThingLinks AI · MCP 使用与建设规范

> MCP 服务给能力,本 skill 给判断力。
> 服务侧只声明「这个工具是什么」;「怎么用这些工具得出结论」全部在这里。

`thinglinks-ai-server` 是 ThingLinks 的**只读**诊断入口,通过 MCP 暴露平台与物联网数据。
工具本身不会让回答变好:模型仍会挑错工具、跳过前置查询、把空值读成故障、承诺自己给不出的东西。
本 skill 就是补这三件事 —— **调度、边界、工作流**。

## 三条硬线(先看这个)

1. **只读。** 不下发命令、不执行脚本、不改配置。该给建议时给到可执行的程度,但落点永远是控制台
2. **身份由服务端注入。** 工具不接受租户/用户/员工参数,不能代表他人或跨企业查询
3. **不要说「已按你的数据范围过滤」。** 租户隔离成立,但组织级过滤在这条链路上不生效 ——
   查不到就是没有,说成「我看不到」会把用户引向完全错误的下一步

展开见 [boundaries](references/boundaries/read-only.md)。

## 怎么用这份 skill

```
用户提问
  ↓ 归域          references/orchestration/routing.md
  ↓ 选工具        references/orchestration/domains/<域>.md
  ↓ 串联          references/orchestration/chaining.md
  ↓ 走流程        references/workflows/<场景>.md
  ↓ 判读          references/workflows/evidence-rules.md
  ↓ 过边界        references/boundaries/*.md
  ↓ 组织结论      references/workflows/answering-contract.md
```

不确定该走哪条:先读 [routing](references/orchestration/routing.md),它把用户的话归到域。

## 一次完整走查(设备离线)

用户:**「3 号线那台温控器离线了,帮我看看」**

| 步 | 动作 | 依据 |
| --- | --- | --- |
| 1 | 归域 → device;进 [device-offline](references/workflows/iot/device-offline.md) | [routing](references/orchestration/routing.md) |
| 2 | 没有设备标识。设备名不可搜,先 `list_device_groups` 拿分组,再 `list_devices` 收敛 | [chaining](references/orchestration/chaining.md) 入口表 |
| 3 | `get_device` 分清「离线」是哪一种:真断链 / 在线但没数据 / 查不到这台 | 工作流第一步 |
| 4 | 连接状态为未连接 → 看最后在线时间;是子设备就转去查网关那台 | 工作流断链分支 |
| 5 | 断线时间点与一次升级接近 → 转 [ota-not-applied](references/workflows/iot/ota-not-applied.md) | 工作流版本分支 |
| 6 | 组织结论 | [answering-contract](references/workflows/answering-contract.md) |

结论形态:「该设备 2026-03-05 14:22 后未再上线,它是网关 G-07 下的子设备,同网关另外 3 台同时离线,
指向网关侧而非这台设备。建议先确认 G-07 的链路。」

反例:「设备离线了,建议检查网络。」—— 没有时间、没有范围、没有下一步,用户拿不到任何可执行的东西。

## References Index

### 调度:选哪个工具、怎么串

| File | Content | When to read |
| --- | --- | --- |
| [orchestration/routing.md](references/orchestration/routing.md) | 用户在问什么 → 进哪个域;跨域时按证据链排序 | 每次开始,尤其问题含糊时 |
| [orchestration/chaining.md](references/orchestration/chaining.md) | 先标识后详情、前置查询、窗口与条数上限、截断怎么读 | 要连着调好几个工具时 |
| [orchestration/domains/identity.md](references/orchestration/domains/identity.md) | 我是谁 / 我能做什么 / 谁能做什么 / 到期信息 | 权限、账号、企业与应用问题 |
| [orchestration/domains/org.md](references/orchestration/domains/org.md) | 组织架构与成员;哪些名字搜得了 | 按部门找人、拿 employeeId |
| [orchestration/domains/audit.md](references/orchestration/domains/audit.md) | 谁改的 / 我改过什么 / 登录记录 / 站内信 | 事故复盘、安全自查 |
| [orchestration/domains/device.md](references/orchestration/domains/device.md) | 设备详情、清单、分组、物模型、影子、命令历史;影子与时序的分工 | 一切设备问题的起点 |
| [orchestration/domains/metric.md](references/orchestration/domains/metric.md) | 时序、统计、横向对比;为什么不能自己算均值 | 涉及数值、趋势、对比 |
| [orchestration/domains/rule.md](references/orchestration/domains/rule.md) | 规则条件、告警记录、执行统计、桥接;三个域的失败态不一样 | 告警与规则、数据没进库 |
| [orchestration/domains/ota.md](references/orchestration/domains/ota.md) | 升级任务、逐设备记录、升级包、版本分布 | 升级与版本切换 |
| [orchestration/domains/view.md](references/orchestration/domains/view.md) | 大屏清单与结构摘要 | 大屏没数据 |

### 边界:不能做、看不到、答不了

| File | Content | When to read |
| --- | --- | --- |
| [boundaries/read-only.md](references/boundaries/read-only.md) | 只读的具体含义;为什么不是「还没做」;只读不等于不给结论 | 用户要求改、发、升、跑 |
| [boundaries/identity-injection.md](references/boundaries/identity-injection.md) | 身份服务端注入;凭证与设备凭据都不可读 | 用户要求代表他人或换企业查 |
| [boundaries/data-visibility.md](references/boundaries/data-visibility.md) | 租户隔离成立、组织级过滤不生效;由此定下的措辞纪律 | 任何要描述「范围」的回答 |
| [boundaries/unanswerable.md](references/boundaries/unanswerable.md) | 答不了什么 + 每条的标准回应形状 | 问题看着能答但数据接不上时 |

### 工作流:一类场景一条流程

| File | Content | When to read |
| --- | --- | --- |
| [workflows/answering-contract.md](references/workflows/answering-contract.md) | 结论带字段与取值、该下判断就下、数量用总数、建议要可执行 | 组织最终回答 |
| [workflows/evidence-rules.md](references/workflows/evidence-rules.md) | 空值语义、量纲、极值与均值、查无此人、权限两批、失败态差异、多源印证 | 读到返回值之后 |
| [workflows/iot/device-offline.md](references/workflows/iot/device-offline.md) | 「离线」的三种含义与各自的路径 | 说设备离线 |
| [workflows/iot/data-not-updating.md](references/workflows/iot/data-not-updating.md) | 在线但没数据:全空 / 部分空 / 最近才停 | 数据不刷新 |
| [workflows/iot/never-reported.md](references/workflows/iot/never-reported.md) | 报「时序表不存在」时的排查:与「这段没上报」的区别、影子对照、编码核对 | 查时序或统计报表不存在 |
| [workflows/iot/shadow-analysis.md](references/workflows/iot/shadow-analysis.md) | 影子/时序/统计按跨度怎么选;带时间段返回原始行、快照值不能描述整段;空值三种读法 | 要基于影子取值做判断或算区间统计 |
| [workflows/iot/baseline-profile.md](references/workflows/iot/baseline-profile.md) | 建立运行基线的顺序与四个要回答的问题 | 要一个判断异常的参照 |
| [workflows/iot/anomaly-cross-check.md](references/workflows/iot/anomaly-cross-check.md) | 五源交叉定性;典型组合与结论 | 看到可疑读数要定真伪 |
| [workflows/iot/fault-triage.md](references/workflows/iot/fault-triage.md) | 现象 → 按可能性排序的排查清单 | 用户只描述了现象 |
| [workflows/rule/threshold-audit.md](references/workflows/rule/threshold-audit.md) | 阈值 / 实际区间 / 物模型量程 三者并排判误报 | 告警量异常多 |
| [workflows/rule/rule-misfire.md](references/workflows/rule/rule-misfire.md) | 没触发 / 触发没告警 / 触发过频 三种分法 | 说规则没生效 |
| [workflows/rule/bridge-failure.md](references/workflows/rule/bridge-failure.md) | 桥接清单 → 单条追踪定位卡在哪一步;死信优先 | 数据没进目标库 |
| [workflows/iot/ota-not-applied.md](references/workflows/iot/ota-not-applied.md) | 任务成功数与设备版本分布对不上时怎么查;逐台四分法 | 升级没到位 |
| [workflows/iot/command-not-effective.md](references/workflows/iot/command-not-effective.md) | 命令有没有下发、设备回没回、当前在不在线 | 说命令没反应 |
| [workflows/platform/permission-denied.md](references/workflows/platform/permission-denied.md) | 权限码 → 组织归属 → 配置组合体检 | 看不到菜单 / 不能做某事 |
| [workflows/platform/login-and-access.md](references/workflows/platform/login-and-access.md) | 企业到期 / 应用到期 / 账号状态 三个方向的分法 | 登不上、多人同时不可用 |
| [workflows/platform/change-forensics.md](references/workflows/platform/change-forensics.md) | 谁改的:筛选方式、查无此人、答不了新值 | 事故复盘 |
| [workflows/view/dashboard-no-data.md](references/workflows/view/dashboard-no-data.md) | 未发布 / 没填地址 / 外部数据源 / 转到数据侧 | 大屏空白 |

### 建设:造与接这个服务

> 这一组只给开发 agent。面向客户的 AI 运行时**不加载**本组内容。

| File | Content | When to read |
| --- | --- | --- |
| [server/architecture.md](references/server/architecture.md) | 五模块、三层分工、下游 Service/Converter/Controller 约定、预留包 | 上手改这个服务 |
| [server/protocol/transport.md](references/server/protocol/transport.md) | 无状态传输的理由、端点三处同步、SDK 版本、静态 Bearer 偏离 | 改协议或路径 |
| [server/protocol/tool-registration.md](references/server/protocol/tool-registration.md) | instructions 同步约束、annotations、description 写法、错误消息 | 注册或修改工具 |
| [server/protocol/output-schema.md](references/server/protocol/output-schema.md) | 反射生成、强制校验、宽松策略、单测照不到的盲区 | 出参形状相关问题 |
| [server/development/steps.md](references/server/development/steps.md) | 加一个工具的五步与必做验证 | 加工具 |
| [server/development/hard-rules.md](references/server/development/hard-rules.md) | 八条会造成静默错误的硬规则 | 加工具前通读 |
| [server/development/downstream.md](references/server/development/downstream.md) | /inner/mcp 端点约定、产物命名、数据权限显式开、facade 依赖 | 要在下游加接口 |
| [server/client-integration.md](references/server/client-integration.md) | 接入三步、连不上的排查顺序、工具清单缓存 | 接客户端、排查连通性 |
| [server/build-test.md](references/server/build-test.md) | 先装框架仓、`-am`、测试分层、单测照不到的三处 | 构建与测试 |

## Assets 与 scripts

- `assets/playbook-template.md` —— 新增工作流的骨架,照着填
- `scripts/check_tool_drift.py` —— 拉 `tools/list` 与 `orchestration/domains/*.md` 对账,
  列出「代码有目录没写」与「目录写了代码没有」

## 扩展约定

这份 skill 按「一个文件 = 一个会独立增长的单元」组织,新增走加文件而不是改大文件:

| 新增什么 | 放哪 | 还要做什么 |
| --- | --- | --- |
| 一个能力域 | `references/orchestration/domains/<域>.md` | 在 routing 表和本页索引各加一行 |
| 一个工具 | 写进它所属的域文件 | 同步服务侧 `SERVER_INSTRUCTIONS`;跑一次 drift 脚本 |
| 一个排查场景 | `references/workflows/<域>/<场景>.md` | front matter 写 `requires`;在本页索引加一行 |
| 一条边界 | 归到 boundaries 四篇之一 | 只有当它不属于任何一篇时才新建 |

入口类工具(取标识的清单查询)与单步自检工具不单独写工作流,它们在 `chaining.md` 的入口表里。

运行时目录(orchestration / boundaries / workflows)里**不出现类名、模块路径、SQL 与表名** ——
那些属于 `server/`。写着写着冒出类名,说明这段内容放错了地方。

## 相关 skill

- **[`thinglinks-cloud`](../thinglinks-cloud/)** —— 这些字段是怎么产生的:上行链路、物模型、影子、规则引擎、多租户
- **[`thinglinks-util`](../thinglinks-util/)** —— 框架底座:协议编解码、缓存、租户上下文
- **[`thinglinks-web`](../thinglinks-web/)** —— 控制台页面与调试面板
- **[`thinglinks-workspace`](../thinglinks-workspace/)** —— 哪个仓、哪条版本线、什么不能提交

分工准则:**「这个字段是怎么来的」去那四个,「拿到这个字段能得出什么结论」在这里。**

---

> **最后核对**:工具清单以运行中的 `tools/list` 为准;字段语义随版本演进,
> 落地前核对当前源码 `com.mqttsnet.thinglinks.ai.*` 与真实调用返回。
