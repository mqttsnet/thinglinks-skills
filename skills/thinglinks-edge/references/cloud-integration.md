# 云边对齐与 Cloud 诊断

## 先核对身份和版本

| 身份/配置 | 含义 | 常见错误 |
| --- | --- | --- |
| Edge instanceId | 执行流程的实例 | 当作 Cloud 设备标识 |
| 本地 nodeId / 模板设备标识 | 受管模板中对应 Cloud deviceIdentification | 使用设备名称或现场 IP |
| 网关 deviceIdentification | Edge MQTT 连接身份、Topic 路径身份 | 用子设备身份配置网关连接 |
| 子设备 gatewayId | Cloud 拓扑归属 | 绑定其他网关却向当前网关上报 |
| productIdentification + boundProductVersionNo | 该设备的模型快照 | 使用产品最新版本或网关默认模型 |
| serviceCode/propertyCode/commandCode | 模型编码 | 用中文名称替代编码 |

`tl-device` 建立本地台账，不自动创建 Cloud 子设备。缺设备或拓扑时，引导到 Cloud 正式控制台登记/绑定并核对，不能用假标识先“报上去再说”。

## 有 Cloud MCP 时怎样协作

调用前按 [`thinglinks-ai`](../../thinglinks-ai/SKILL.md) 解释返回字段；只使用当前工具清单和 schema 中真实存在的参数。

| 要确认 | 最少查询 | 接着做什么 |
| --- | --- | --- |
| 工具连接有疑问 | `check_mcp_connection` | 只证明 MCP 通路，不代表 Edge MQTT 可用；正常时不重复自检 |
| 不知道设备标识 | `list_device_groups` / `list_devices` 收敛 | 名称不能当任意搜索参数；重名由用户确认目标 |
| 子设备是否存在、属于谁、什么版本 | `get_device` | 读取 `deviceIdentification/productIdentification/boundProductVersionNo/gatewayId`，有网关再查该网关 |
| 属性/单位/量程 | `get_thing_model` | 与设备绑定版本对照；模型截断时不能断定缺属性 |
| 当前值是否到了 | `get_device_shadow` | 对比具体属性值和采样/记录时间，旧值不证明本次接入 |
| 持续上报或断档 | `query_timeseries`；统计用 `get_metric_stats` | 固定设备、服务属性和时间窗；聚合数据不证明每个原始点都到了 |
| 参数是否正确、执行有无证据 | `get_command_definition` + `get_device_command_history` | 再对照 Edge 命令状态、现场读回；见 [命令](commands.md) |
| 同一网关是否批量异常 | 按已确认清单选少量同网关设备 | 区分单流程、单设备和整个网关问题 |

这些 MCP 工具只读，不提供设备注册、网关配置、模板部署或下发命令。它们不返回设备凭据，也不读取 Edge 本地容器、spool 或 PLC；缺这半边证据时指出需要的 Edge 页面/字段。MCP 不可用时用 Cloud 控制台完成同样核对，不把连接失败写成“设备不存在”。

## 模型查询有两种语义

当前 MCP `get_thing_model(productIdentification)` 给出产品的 `activeVersionNo`，没有指定子设备历史绑定版本的参数。若与 `get_device.boundProductVersionNo` 不同，**不能据此自动迁绑、覆盖映射或判旧属性不存在**。

在 Edge 模板页按子设备的产品标识和绑定版本执行“读取物模型”。当前管理接口 `POST /api/cloud/model/query` 要求显式 `productIdentification` 和 `versionNo`，通过 MQTT `model/query` 读取对应快照；不能省略成网关自己的模型。该 POST 是查询动作，但仍使用管理会话与 CSRF。
离线使用已取得的相同版本缓存/手填配置时，标注缓存来源和未完成的云端校验。服务分片未取全、产品/版本不一致应停止使用该结果。

## 数据链路的四个确认点

1. **现场 → Edge：** 有效样本、质量、目标实例/设备、时间。原生节点自己采到的值，若没有接入 `tl-uplink`，不会凭空进入统一上云链路。
2. **Edge 本地接收：** 台账/当前值与聚合、spool 接收情况。现场“未纳管”探测只是从流程反推，不等于可靠台账。
3. **Edge → broker：** 云连接实际状态、发布错误、积压与补传进度。QoS/PUBACK 只到消息传输确认，不是 Cloud 模型处理或落库确认。
4. **Cloud 消费与保存：** 相同子设备、版本、编码、时间窗的影子与历史数据。必要时转 Cloud 源码/服务日志，见 [云端协同契约](../../thinglinks-cloud/references/iot/edge-integration.md)。

`GET /api/cloud` 的脱敏响应提供 `status`、`spool`、`replay`、`outages`。pending 持续增长先定位连接/发送/磁盘问题；`etaSec:null` 按 reason 说明不可估算，不编造完成时间。spool 排空仍不证明 Cloud 保存了每个点。
Manager 入队时的 eventTime 保留用于补传；当前流程不通用地还原设备原始采样时刻。对账时先确认时间语义，不能拿补传时刻冒充新采样。

## 推荐结论形状

“Edge 在 10:05 接受该温度点 26.5℃；Cloud 同设备影子仍停在 09:40，网关连接在线。因此已确认现场采集正常，上云之后的处理尚未确认。下一步核对该子设备绑定版本下的服务/属性编码，并查看这段时间的发布错误与积压。”

证据充分时直接定位；不足时指出第一段未证明的链路和具体检查，不堆出一页无优先级的可能原因。

依据：Edge `apps/manager/src/http/cloud/{config,model}.ts`、`core/cloud/{runtime,model-client,batch}.ts`（core 位于 `apps/manager/src/`）；Cloud `ThingModelTool`、`DeviceDetailResultVO`，源码路径见 [云端协同契约](../../thinglinks-cloud/references/iot/edge-integration.md)。
