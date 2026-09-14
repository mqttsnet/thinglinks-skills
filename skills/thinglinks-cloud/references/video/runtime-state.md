# 视频运行时状态与事件(设备 / 通道 / 媒体节点 / 前端推送)

在线状态有多个写入方并发写,事件只在真正翻转时发。改这块先分清「谁写库、谁发事件、谁只听」。总览见 [video.md](video.md),排查见 [troubleshooting.md](troubleshooting.md)。

## 设备:唯一写入口 + HLC CAS

所有协议的设备在线状态都走 `VideoDeviceService.updateDeviceLiveness(deviceIdentification, lastKeepaliveTime, onlineStatus, eventHlc)`,协议包里不自己写库。

- **CAS 单调写**:库内 `last_status_event_hlc` 严格小于本次 `eventHlc` 才覆盖。返回 `false` 表示已有更新的事件落库,本次是迟到事件,按 event-time 丢弃(日志 `[设备存活] CAS 拒绝`),不是故障。
- **时钟** `VideoStatusEventClock`(HLC:物理毫秒作高位、同毫秒逻辑序号作低位,严格单调):注册、心跳、注销、超时判定、强制下线,每次状态变更都取新时钟。超时判定与真实心跳按时钟**公平竞争**:判定期间心跳先落库,超时那次写入被 CAS 拒绝;超时先写入,随后的心跳照样能把设备改回在线。调用方**不要**再叠加「原状态是什么」「心跳够不够旧」这类条件。
- **返回 `true` 才跟进副作用**(发事件、推前端)。方法内部已做完两件事,调用方别重复:① 设备缓存刷成同一状态(缓存失败只告警,库是权威,下次读会回源);② 置离线时,该设备名下的通道一并置离线。
- **置在线不联动国标通道**:国标通道状态由 Catalog 上报决定。JT/T 1078 例外 —— 通道是平台按通道数生成的逻辑位,没有第二个信息源,设备上线时通道跟着置回在线。
- `lastKeepaliveTime` 只有心跳传值;注册、注销、强制下线传 null(不动该列)。

### 写入方

| 协议 / 来源 | 位置 |
| --- | --- |
| GB28181 | `RegisterRequestProcessor`(注册 / 注销)、`KeepaliveNotifyMessageHandler`(心跳)、`DeviceStatusResponseMessageHandler`(设备状态查询应答) |
| JT/T 1078 | `TerminalAuthHandler`、`TerminalHeartbeatHandler`、`Jt808ChannelHandler` |
| ONVIF / RTSP | `OnvifService`、`RtspPlayService`、`RtspProxyLivenessListener`、`ActiveStreamLivenessProbe`(见 [media-access.md](media-access.md) 的主动拉流设备一节) |
| 保活超时 | `DeviceKeepaliveTimeoutServiceImpl`(XXL `deviceKeepaliveTimeoutCheckJobHandler`) |

### 保活超时

- 候选集是库里 `online_status = true` 的设备;RTSP / ONVIF(`isActiveStream`)整类跳过 —— 它们的 `last_keepalive_time` 与 `register_time` 恒为空,不跳过会被全部判成超时。
- 判据只看库里的 `last_keepalive_time`(为空退到 `register_time`):`当前时间 − 最近心跳 > keepaliveInterval × keepaliveTimeoutCount`,缺省 60 秒 × 3 次。两个字段都空视为超时;时间解析失败**保持在线**并告警(格式问题不是设备没了的证据)。
- 判超时同样取新时钟走 `updateDeviceLiveness`,翻转后发 `DeviceInfoOfflineEvent`。

## 媒体节点:hook 只写在线,离线只认探测

| 写入方 | 写 | 说明 |
| --- | --- | --- |
| hook 到达(`ZlmHookOnlineStateWriter`) | 只写在线 | 报文到达本身就是存活证据;`hook_alive_interval` 通常比心跳任务密,上线更快被看见 |
| 心跳任务(XXL `zlmMediaServerHeartbeatJobHandler` / `ablMediaServerHeartbeatJobHandler` → `ZLMMediaServerStatusManager` / `ABLMediaServerStatusManager`) | 在线 / 离线 | 平台 → 节点 `getServerConfig` 反向探测;探通时顺带采集指标,并纠正 hook 配置漂移、刷新凭据(节点关闭了自动配置时只告警、不下发) |
| 启动探测(`ZlmStartupProbeRunner`) | 在线 / 离线 | video-server 启动后尽力刷一次,不阻塞就绪 |

- hook 停了**不**判离线:可能只是回调地址配错,要一次真实探测来定性。
- `serverOnline` / `serverOffline` 是带「当前值 ≠ 目标值」的条件更新,**返回值取真正影响的行数**,并发写入里只有一个拿到 `true`;上线 / 离线事件只跟着这个结果发。别拿调用方手里的 DTO 快照判翻转。
- `MediaServerStatusEventListener` 只做事后通知,**不写库**,也别在里面再调 `serverOnline` / `serverOffline` 兜底。

## 事件分层

| 层 | 事件 | 约束 |
| --- | --- | --- |
| entity(协议无关) | `DeviceInfoOnline` / `Offline` / `UpdatedEvent`、`ChannelInfoOnline` / `Offline` / `UpdatedEvent`、`DeviceKeepaliveEvent`、`MediaServerOnline` / `Offline` / `Change` / `DeleteEvent`、`DeviceAlarmEvent` | 协议层要通知业务层时只能用这一层 |
| biz(媒体 hook) | `MediaArrivalEvent` / `MediaDepartureEvent` / `MediaPublishEvent` / `MediaNotFoundEvent` / `MediaRecordMp4Event` / `MediaRtpServerTimeoutEvent`、`HookZlmServerStartEvent` / `HookZlmServerKeepaliveEvent`、`MediaServerRegisteredEvent` / `MediaServerCapabilityDetectedEvent` | biz 的 listener 不得依赖协议 bean |
| biz-protocol(协议专属) | GB28181 的 18 类信令事件(见 [gb28181.md](gb28181.md))、`Jt1078DeviceOnlineEvent` / `Jt1078DeviceOfflineEvent` / `Jt1078StreamReadyEvent` | 定义、发布、监听都在协议包内闭环,不渗透到 biz |

- `DeviceInfoOnlineEvent` / `DeviceInfoOfflineEvent` 由 `SipEventPublisher`(国标)和 `DeviceKeepaliveTimeoutServiceImpl`(超时)发。
- iot-executor 会加载 biz 的 listener;hook 类 listener 在执行器里没有事件源,不会触发。

## 前端推送(Spring WebSocket,集群路由)

| 服务内端点 | 内容 |
| --- | --- |
| `/anyone/videoSocket/deviceStatus/{tenantId}` | 设备上下线(`DeviceStatusWebSocketPusher` 听 `DeviceInfoOnline` / `OfflineEvent`),外加每条连接一个定时快照(通道状态、拉流代理、推流清单) |
| `/anyone/videoSocket/alarm/{tenantId}` | 告警(`AlarmWebSocketPusher` 听 `DeviceAlarmEvent`;`DeviceAlarmNotificationListener` 同时发通知) |
| `/anyone/videoSocket/mediaServerMetrics/{tenantId}/{serverId}` | 媒体节点实时指标 |

- 网关对应路由 id `wsVideo`(`Path=/wsVideo/**`)。
- 会话表 `VideoWebSocketSessionHolder` 是 Spring Bean:设备状态与告警是两个租户级广播频道(principal 固定为 `BROADCAST`)。推送方与连接持有方常不在同一节点,走集群注册表 + Stream 投递,发送侧装配在 `WsVideoClusterConfig`。
- 身份放在每连接一份的 `WebSocketSession#getAttributes()`(握手拦截器写入),`WebSocketAuthGuard.requireSameTenant` 校验租户。**不要**改回 `@ServerEndpoint`:它的 `getUserProperties()` 被同一端点的所有连接共享,握手并发时会互相覆盖身份。
- 通道上下线、目录新增通道、拉流代理 / 推流的增删改**不单独铺事件**,靠 `deviceStatus` 端点的定时快照覆盖。
