# ThingLinks Edge 与 Cloud 协同

本篇负责云端身份、Topic、模型、数据与状态/回执契约。现场设备接入、点表、Node-RED 模板、实例和维护使用 [`thinglinks-edge`](../../../thinglinks-edge/SKILL.md)；通过 MCP 取数据使用 [`thinglinks-ai`](../../../thinglinks-ai/SKILL.md)。没有 Edge 本地观测时不把 Cloud 查询结果当成 PLC/容器诊断。

核对基线：2026-09-14，旗舰 Cloud 与 Edge 当前工作树。社区版需重新核对对应处理器及 Facade。代码存在、运行中已加载、协议/Cloud/物理设备验收和已发布是不同证据层。

## 职责与身份

Edge 复用 Node-RED 进行现场协议读写，Manager 统一聚合、持久缓存、MQTT、命令与状态；Cloud 管产品/设备/拓扑、模型快照、消息消费、影子/时序和业务规则。
Cloud `ProtocolEdgeAdapter` 是上行总线的归一适配类，不等于独立 Edge 产品，不能套用到 Node-RED 流程生成。

- MQTT 连接和 Topic 路径使用**网关 deviceIdentification**。
- 数据载荷 `devices[].deviceId` 和命令体 `deviceIdentification` 保留**目标子设备标识**。
- Edge instanceId 是本地执行实例；受管模板的本地设备标识需与 Cloud 子设备标识对齐。
- 本地 `tl-device` 登记不自动完成 Cloud 注册；子设备应存在、归属于该网关，并绑定已发布的产品版本。
- Edge 归属预校验不替代 Cloud 服务端授权。不要因为请求来自网关就信任任意载荷子设备归属。

## Topic 与确认点

以下相对前缀为 `/v1/devices/{gatewayIdentification}`，协议版本以连接配置为准。

| 相对 Topic | 方向 | 业务用途与确认 |
| --- | --- | --- |
| `/datas` | Edge → Cloud | 批量子设备/服务数据；MQTT 发布成功不证明保存成功 |
| `/model/query`、`/model/queryResponse` | 请求/响应 | 读取指定产品、版本的模型，按服务分片续拉 |
| `/topo/query`、`/topo/queryResponse` | 请求/响应 | 查询指定子设备及网关归属 |
| `/topo/update`、`/topo/updateResponse` | 请求/响应 | `deviceStatuses` 中指定子设备 `deviceId` 与 `ONLINE/OFFLINE`；逐设备确认 |
| `/command` | Cloud → Edge | 目标子设备命令；进入已声明的唯一活跃控制消费者 |
| `/commandResponse` | Edge → Cloud | 原 `head.mid`、目标子设备及服务/命令结果；与写入重试分离 |

数据体示意（脱敏示例，非完整信封）：

```json
{
  "devices": [{
    "deviceId": "meter-example",
    "services": [{
      "serviceCode": "electrical",
      "data": {"voltage": 230.1},
      "eventTime": 1789344000000
    }]
  }]
}
```

完整 `head/dataBody/dataSign`、cipherFlag 和序列化沿用 [protocol-envelope.md](protocol-envelope.md)。实际配置用户无需逐流程拼主题/签名。
Cloud Long/Snowflake `mid` 在 Edge 不能经 JS Number 取值；使用 Edge `ProtocolMid` 与 `serializeEnvelope` 保留精度和协议要求的数值 token。

## 绑定版本和模型引导

先从设备详情取得 `productIdentification`、`boundProductVersionNo`，再核对服务、属性、命令及参数。产品 `activeVersionNo` 不等于每台设备的绑定版本。
MCP `get_thing_model` 当前按产品查询并返回 activeVersionNo，不支持请求任意历史绑定版本；不能把这个结果直接当成旧版本设备的完整配置依据。
Edge 模板页的模型查询明确提交子设备产品与 `versionNo`，走 MQTT `model/query`；省略两项会落到发起网关自己的默认模型。配置接口因此禁止省略。
查询失败、分片缺失、返回版本变化或未发布，不作为空模型继续配置。离线手填/缓存与已取得相同版本的在线校验分开呈现。
配置错误时修正目标映射；不要为了接入方便擅自发布产品、迁绑设备或改共享模型。

## 数据落库排障

按相同子设备、服务属性、时间窗串联：现场样本 → Edge 台账/质量 → 聚合/spool → MQTT 发布 → Cloud 消费 → 绑定模型匹配 → 影子/历史。

1. 先核对 gateway/child 身份、设备存在与归属、绑定版本/编码/类型；物模型名称不能代替编码。
2. 云连接失败走 [device-access.md](device-access.md) / [acl-topic-match.md](acl-topic-match.md)。Edge Manager 到 broker 的诊断不代替采集实例到 PLC 的网络检查。
3. MQTT 已确认但 Cloud 无新值时，检查 DeviceDatasHandler 的协议/解密/设备缓存与数据处理错误；进入 [uplink-pipeline.md](uplink-pipeline.md)、[device-data.md](device-data.md)。
4. Cloud 新影子值与对应窗口历史分别确认。旧影子、补传排空和页面渲染不作为本次数据保存证明；时间转换与聚合方式需要对齐。
5. 已确认数据进入 Cloud 后，再按用户问题查规则或告警，避免没有采集证据就调整告警阈值。

数据缓存是有界补传，不承诺每次发送即最终落库或 exactly-once。Manager 保留入队时的 eventTime；不通用还原原设备采样时刻。

## 在线状态与多来源

`/datas` 不自动替代子设备 `topo/update`。Edge 依据真实采样/协议状态，按来源合并后查询归属，再上报状态，只有该设备业务响应明确成功才确认。
同设备另一来源仍在线时，单来源失败不能覆盖整设备；没有在线且存在未知来源时不猜。网关重连、流程续约、台账恢复、历史补传不单独建立新在线证据。
故障定位分别看网关连接、观察者/运行代次/序号、现场状态、Cloud 逐项结果。详细行为及旧流程升级见 [Edge 状态](../../../thinglinks-edge/references/presence.md)。

## 命令回执的现有缺口

当前 `CommandResponseHandler` 按 Topic 网关解析设备，再交 `EventCommandService` 保存**独立 COMMAND_RESPONSE 记录**；不是根据 mid 更新原下发记录。
该服务把响应记录存储状态设为 SUCCESS，业务 errCode/serviceCode/cmd 在响应内容中另行解释。不能把“响应记录成功”直接当作设备执行成功，也不能凭原记录 respondedTime 为空断言设备未回应。
对子设备检查原下发、网关响应、载荷里的子设备标识与 `mid/serviceCode/cmd`、Edge 结果和必要的设备读回。只读 MCP 历史截断/不含完整载荷时明确缺口，使用正式 Cloud 调试页或授权日志补证。
Edge 持久去重和一次租约不允许自动重做 unknown 写入；回执传输失败可以重试。Cloud 记录、Edge 状态和物理效果分别描述，见 [Edge 命令](../../../thinglinks-edge/references/commands.md)。

## 源码锚点

以下 Cloud 路径相对对应 Cloud 仓根；Java 类路径按当前包结构核对。

| 职责 | 路径 |
| --- | --- |
| 数据、状态、模型、回执 Topic | `thinglinks-mqs/thinglinks-mqs-biz/src/main/java/com/mqttsnet/thinglinks/mqs/uplink/handler/` 下 `DeviceDatasHandler.java`、`UpdateSubDeviceHandler.java`、`ModelQueryHandler.java`、`CommandResponseHandler.java` |
| 响应独立保存 | `thinglinks-mqs/thinglinks-mqs-biz/src/main/java/com/mqttsnet/thinglinks/mqs/uplink/service/EventCommandService.java` |
| 数据处理/绑定版本 | `thinglinks-mqs/thinglinks-mqs-biz/src/main/java/com/mqttsnet/thinglinks/mqs/service/impl/DeviceDataProcessingServiceImpl.java` |
| 拓扑状态与设备业务 | `thinglinks-link/thinglinks-link-biz/src/main/java/com/mqttsnet/thinglinks/device/service/impl/DeviceServiceImpl.java` |
| 下发与影子 | 上述 impl 目录内 `DeviceCommandServiceImpl.java`、`DeviceShadowServiceImpl.java` |
| MCP 当前模型语义 | `thinglinks-ai/thinglinks-ai-biz/src/main/java/com/mqttsnet/thinglinks/ai/tool/iot/device/ThingModelTool.java` |
| MCP 设备/历史字段 | `thinglinks-ai/thinglinks-ai-entity/src/main/java/com/mqttsnet/thinglinks/ai/vo/result/` 下 `DeviceDetailResultVO.java`、`DeviceCommandHistoryResultVO.java` |

Edge 对应 `apps/manager/src/core/cloud/`、`core/edge/presence-observers/`、`http/edge/`（后两项在 `apps/manager/src/` 下）。进入源码前读取该仓 AGENTS.md，保留其他工作；没有证据不修改共享 Nacos、重置凭据或重启其他服务。
