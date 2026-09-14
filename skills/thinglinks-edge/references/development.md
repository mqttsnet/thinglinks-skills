# 开发入口与验证

本篇供进入源码的维护/开发任务使用，普通接入先读操作专题。所有下面路径相对已确认的 Edge 仓根；不固定某台机器的绝对路径。

## 实际代码地图

| 要改/查什么 | Edge 路径 |
| --- | --- |
| 协议目录、固定版本、节点类型 | `apps/manager/src/core/protocols/catalog.ts` |
| 参数、地址、类型、解码与倍率 | `apps/manager/src/core/flows/templates/parameters.ts`、`industrial-address.ts`、`transform.ts`、`framing.ts`（后三项同目录） |
| 各协议纯流程生成 | `apps/manager/src/core/flows/templates/builtin/` |
| 模型映射、控制组成/反算 | `apps/manager/src/core/flows/templates/model-mapping.ts`、同目录 `control-*.ts` |
| 追加/替换、引用重映射、修订冲突 | `apps/manager/src/core/flows/deployment.ts`、同目录 `merge.ts`、`admin-client.ts` |
| 单次设备诊断/临时流程恢复 | `apps/manager/src/core/protocols/diagnostics/`、`apps/manager/src/http/instance/protocol-diagnostics.ts` |
| 现场台账、当前值、历史与观察者 | `apps/manager/src/core/edge/`、`apps/manager/src/http/edge/{ingest,field}.ts` |
| 模板观察元数据/租约 | `apps/manager/src/core/flows/templates/presence-flow.ts`、同目录 `presence-observation.ts` |
| 上云、模型、消息身份、批次 | `apps/manager/src/core/cloud/{gateway,runtime,model-client,envelope,mid,batch}.ts` |
| 子设备状态同步/逐项响应 | `apps/manager/src/core/cloud/presence/` |
| 命令校验/去重/租约/回执 | `apps/manager/src/core/cloud/commands/`、`apps/manager/src/http/edge/commands.ts` |
| 缓存与补传 | `apps/manager/src/core/spool/` |
| 实例生命周期、策略、编辑器网络 | `apps/manager/src/core/instance/`、同级 `docker-policy/`、`network-isolation/` |
| 节点包/离线种子/原生兼容构件 | `apps/manager/src/core/nodes/`、`scripts/protocol-seed/`、`scripts/opcua-native/` |
| 备份、事务恢复与启动门禁 | `apps/manager/src/core/archive/`、`apps/manager/src/index.ts` |
| 页面、点表导入、试读 UI | `apps/web-console/src/views/flows/`、同目录 `protocols/` |

Manager 是 Fastify + TypeScript + SQLite + Dockerode；Edge 控制台是本仓 Vue/Vite 应用。按实际 package.json 和 AGENTS.md 选择运行时/命令；显式 `.ts` 相对导入是当前约定，不机械改 `.js`。
平台节点的实际消费版本以 `core/nodes`、锁文件和运行实例为准，不根据旧目录名推断打包方式；不要把独立节点包开发自动并回 Edge 仓。

## 扩展协议保留的分层

1. 在协议目录声明真实固定组件、完整性与必需类型；完整依赖/原生构件单独准备，不往 Manager 加运行依赖只为展示一个组件。
2. 模板生成器只构造流程：参数、界限、点位、显式引用、修订；不安装组件、不连接设备、不写库、不部署。优先复用现成节点，私有厂商逻辑确实缺失时再作适配。
3. 成功样本进入既有 `tl-uplink` / Manager 聚合缓存链；控制复用 CommandBridge；状态用有序观察合同。不为每个协议重造 MQTT、签名、缓存和重试。
4. 参数作为数据序列化，不插入可执行源码；新增 config-node 引用字段同时更新安全复制/重映射规则。
5. 诊断功能使用独立生命周期：先持久化意图/清理责任，限定一次读取，重启只恢复清理；不让试读进入保存快照后重放。

大 Snowflake `mid` 在 JS 内部保留十进制字符串身份，通过 `ProtocolMid` / `serializeEnvelope` 输出合同要求的数值 token。不要转 Number 或普通 JSON.stringify 造成精度丢失。Cloud 信封规则引用 [云端协同](../../thinglinks-cloud/references/iot/edge-integration.md)，不重复维护一套。

## 按变化选择验证

- 先运行所改模块旁的最窄测试，再用当前仓命令 `pnpm check`、`pnpm build`；源码通过只说明源码层。
- 模板/解码：执行生成的 Function，覆盖真实样本、非法/空参数、边界数值、引用重映射及修订冲突。
- 节点/安装/策略：用隔离真实实例核对完整加载；allowlist 负向重启应证明未批准节点不能继续加载。保留固定包与版本证据。
- 协议：分别核对实际读、反算写、拒绝/unknown、回执、断连恢复；只采集协议明确把控制记为不可用。
- 状态：同实例/跨实例多个来源、旧序号/代次、仅变化样本、删除流程、Manager/MQTT 恢复、逐设备响应失败。
- 维护：启动前门禁、失败恢复、已知实例保留、数据一致性；使用本轮拥有的临时资源与精确 ID 清理，避免全局 prune。

真实容器入口包括 Edge `apps/manager/scripts/verify-all.sh`、`scripts/verify-protocol-components.mjs`、`scripts/verify-protocol-templates.mjs`。先读对应说明和参数；它们可能安装包、建容器或执行设备写入，不能为了更新文档自动跑全套现场测试。

报告分开列源码、构建、模拟器、真实 Cloud、物理设备、已有实例升级/恢复、发布制品。历史测试次数、临时 IP/凭据、执行计划放当前任务记录，不写进技能的稳定规则。

## 来源冲突的处理

本版核对 2026-09-14 当前工作树；Edge 正在演进，先比较产品源码、模板修订、运行镜像与部署状态。旧任务的“未实现”可能已被新代码覆盖，新代码存在也不意味着已发布/在用。更新技能时同时调整能力矩阵、操作分支和相关行为用例。
