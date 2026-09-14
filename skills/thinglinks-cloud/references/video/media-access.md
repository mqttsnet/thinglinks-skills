# 流媒体接入与多协议(ZLM hook / RTSP / ONVIF / JT/T 1078)

GB28181 信令层见 [gb28181.md](gb28181.md),总览与多协议 SPI 见 [video.md](video.md)。

## ZLM hook(媒体事件入站)

- 入口:controller `anytenant` 开放面 `/video/anyTenant/zlmHook/index/hook/{type}`;`HookTypeEnum` 枚举回调类型(`on_publish` / `on_play` / `on_stream_changed` / `on_stream_none_reader` / `on_record_mp4` / server start/keepalive…)。回调地址前缀优先取媒体节点上的 `hookHost`,留空走 Nacos `media.hook-domain-prefix`。
- 处理模式:hook → 认证(见下)→ 解析租户(`mediaServerId@<tenantId>`)→ 转 **Spring 事件**(`media/zlm/event/HookZlmServer*Event`、`media/server/event/hook/{HookData,HookSubscribe}`,流到达 `MediaArrivalEvent`、录像完成 `MediaRecordMp4Event`)→ biz `manager/hook` 与各域 listener 消费。新增回调行为 = 加 listener,不改 hook 入口。
- `on_publish` 应答里的 `enable_audio`(`HookResultForOnPublish`,默认 true)会**逐流覆盖**媒体节点自己的 `protocol.enable_audio`;改成 false,这路流的音频轨就整个没了。

### Hook 凭据

- **每台 ZLM 一份**:token = `hex(HMAC-SHA256(该节点 secret, mediaIdentification))`(`ZlmHookTokenService`),`ZLMMediaServerStatusManager` 下发 `setServerConfig` 时拼进每个 hook URL 的 `?hookToken=`。
- **Redis 只存校验值**:`ZlmHookCredentialManager` 存 token 的 SHA-256、属主(`mediaIdentification` / `tenantId` / `createdOrgId`)与状态,token 本身和 ZLM secret 都不落盘。
- **生命周期**:下发前 `putPending` → `setServerConfig` 成功后 `activate`(激活失败保持拒绝)→ 节点写库失败时按「属主 + token」精确 `revoke` 补偿,已被替换的新凭据不删。只有 ACTIVE 凭据能过认证。
- **自动配置必须开启**:新建节点只生成 PENDING 凭据,由心跳下发配置后激活(编辑节点时也会立即下发)。ZLM 节点保存 / 编辑时不允许关闭自动配置,不填按开启;库里存量的关闭节点,心跳只告警不下发,回调一律被拒。
- **属主含组织**:`createdOrgId` 为 null 或 ≤0 视为同一个「无组织」属主,但不是通配;同租户其他组织改写、激活、吊销都不生效。租户一维由 `@<tenantId>` 后缀锁死,只比租户等于没校验。
- **入口 `withAuthenticatedHook`**:`authenticateActive` → 凭据租户须等于 `@<tenantId>` 后缀 → 设租户 → 查库取媒体节点行 → **组织上下文取这一行的 `createdOrgId`**,不取凭据缓存(之后落库的媒体节点 / 拉流代理 / 推流行都写当前组织)。token 不符 401,Redis 或数据库不可用 503。

## stream / record 域

- `manager/stream`:流信息(`StreamInfoManager`)、RTP 收发端口、级联出站 RTP 租约(`OutboundRtpResourceLeaseCoordinator`)、断流自动恢复计数;推流与拉流代理各有表 `video_stream_push` / `video_stream_proxy`;流就绪 / 关闭走 `StreamReadyEvent` / `StreamClosedEvent`。
- `manager/record` + `video_record_plan` / `video_record_file`:录像计划由 XXL `executeRecordPlanScheduleJobHandler` 调度,分**云端录制**与**设备端录像**。设备侧没有「是否在录」的查询命令,下发状态记在 `DeviceRecordStateManager`,读失败按未开录重发(设备侧幂等)。MP4 登记到 base 服务 File 库,上传失败由 `retryRecordFileUploadJobHandler` 补传。
- 截图 `SnapshotService`:只对正在推的流截图(媒体节点 `getSnapshotImage`),流不在推直接报错,不替调用方起点播。

## RTSP

- 设备表达:`access_protocol = RTSP` + `protocol_config.streamSource`(`url` / `username` / `streamPath` / `rtpType`),完整 URL 优先,否则 `RtspSourceUrlBuilder` 拼 `rtsp://user:pass@host:port/path`。
- 起播 `RtspPlayService`:调 ZLM `addStreamProxy`,app 固定为 `proxy`(不与国标推流的 `rtp` 混用),stream = `rtsp_` + MD5(设备 + 通道)前 16 位,同设备同通道复用一路。停止时先 `closeStreams` 再 `delStreamProxy`,不留代理占着媒体节点。
- 设备侧回放:按设备上配的 `playbackUrlTemplate`(`{startTime}` / `{endTime}` 占位)渲染地址(`RtspPlaybackUrlBuilder`)。**没配模板就如实报不支持**,不猜厂商格式 —— 猜错的地址不报错,只会黑屏。
- RTSP 地址里嵌着账号口令,日志只记 `host:port`。

## ONVIF

发现层 + SOAP 控制层 + RTSP 取流层:

- 发现 `OnvifDiscoveryService`:组播 `239.255.255.250:3702` 发 WS-Discovery Probe,按 EndpointReference 去重。
- SOAP `OnvifSoapClient`:手写 envelope(不引 CXF),`GetDeviceInformation` / `GetProfiles` / `GetStreamUri`;认证 `OnvifAuthenticator`(WS-Security UsernameToken)。
- 导入:`POST /onvif/discover` → `/onvif/profiles` → `/onvif/import`,取 RTSP 地址注入凭据落到 `protocol_config.streamSource.url`,之后点播复用 `RtspPlayService`。
- 已接出:PTZ(`OnvifPtzService`)、设备控制(`OnvifDeviceControlService`)、录像检索与设备侧回放(Profile G:`FindRecordings` → `GetReplayUri`)、告警。
- 告警是**拉取点模型**:`OnvifEventSubscriptionManager` 记下设备临时分配的订阅地址(只在本进程内存),`OnvifAlarmPollScheduler` 每 5 秒 `PullMessages`,单台失败不影响其它;进程重启后由 video-server 的 `OnvifAlarmSubscriptionReconciler` 重建订阅。三者都**只能跑在 video-server**,挂到 XXL 执行器上会显示在跑、实际每轮空跳。

## JT/T 1078(车载,自研协议栈)

与其它协议最大的不同:**媒体流必须经过平台**。媒体节点不认 1078 裸流,转封装由平台自己做。

```
终端 ──1078/TCP──▶ 平台 media-port ──帧重组 · PS 封装 · RTP 打包──▶ 媒体节点(openRtpServer)──▶ 播放
  ▲
  └── 0x9101 / 0x9201 里下发的是平台自己的 media 地址 ── 平台 JT808 signal-port
```

- 包结构(`jt1078/`):`codec`(JT808 报文与 1078 音视频包编解码)、`server`(`Jt808SignalServer`,Netty)、`handler`(注册 0x0100 / 鉴权 0x0102 / 心跳 0x0002 / 注销 0x0003 / 通用应答 0x0001、音视频资源列表、文件上传完成)、`session`、`cmd`(`Jt1078PlayCommander` 实时预览 0x9101 / 回放 0x9201 / 资源查询 0x9205,`Jt1078ControlCommander`)、`media`(`Jt1078MediaServer` 收流 → `Jt1078FrameAssembler` → `PsMuxer` → `RtpPacketizer` → `Jt1078RtpForwarder`)、`sdk`(`EmbeddedJt1078GatewayAdapter`,没有真实适配器时才回落 `MockJt1078GatewayAdapter`)。
- 配置 `thinglinks.video.jt1078.*`(`Jt1078Config`):`signal-port`(代码默认 7611)、`media-ip`(留空回落 `sip.public-host`)、`media-port`(**无默认,不配则实时预览与回放下发不了**)、`read-idle-seconds`(180)、`media-idle-seconds`(30)、`stream-ready-timeout-millis`(15000)、`talk-receive-host`(对讲下行接收地址,一般不用配)。
- **最容易搞错**:`0x9101` 里带的是平台的 `media-ip:media-port`,不是媒体节点端口。填成媒体节点端口,终端会把 1078 裸流直推过去,那边不认,**不报错也不出画面**。
- **先建档后接入**:未建档终端注册按标准回 `0x04`(数据库中无该终端),不自动建档。
- **租户路由**:上行只带手机号,`Jt1078TenantRouter` 查 `def_jt1078_tenant_index` 绑租户上下文(索引由 video-server 的 `Jt1078TenantIndexReconciler` 定时对账);Netty IO 线程复用,用完必须 `clear()`。
- 在线状态:注册 / 心跳 / 注销都走 `updateDeviceLiveness`,超时置离线交给 XXL 保活任务。**只能单副本**(会话在进程内 `Jt808SessionRegistry`),见 [video.md](video.md)。
- 对讲:`Jt1078TalkStrategy` / `Jt1078TalkDownlinkService`;接收端口只在持有终端连接的那个副本上。

封装里错了不报错的位置:

- 1078 包头长度随数据类型变:视频帧 30 字节(含时间戳与两个帧间隔),音频帧 26(无帧间隔),透传 18(连时间戳也没有)。按固定 30 解析,音频和透传数据会错位,视频却看起来一切正常。
- PSM 起始码是 `0x000001BC`,不是 System Header 的 `0xBB`;PSM 的 CRC32 用 **MPEG-2 多项式**,不能用 JDK / zlib 的 `CRC32`。

## 主动拉流设备(ONVIF / RTSP)的在线状态

`AccessProtocolEnum.isActiveStream` 目前是 RTSP 与 ONVIF:平台去拉流,设备不注册、不发心跳 → `DeviceKeepaliveTimeoutServiceImpl` 按协议整类跳过,建档即置在线。**豁免谁,谁就必须自带存活来源**:往 `isActiveStream` 加协议必须同时给探测手段,否则探测时一律 `SKIPPED`(不会误判离线,但也永远不会离线)。

| 写入路径 | 方向 | 判据 |
| --- | --- | --- |
| `RtspProxyLivenessListener`(`MediaArrivalEvent`,app=`proxy`) | 只写在线 | 按代理授权记录反查设备;流离开**不**判离线(多半是无人观看拆流) |
| `RtspPlayService` 注册拉流代理失败 | 只写离线 | 设备当场没应答 |
| `ActiveStreamLivenessProbe` 周期探测 | 双向 | ONVIF `GetSystemDateAndTime`(规范免认证)/ RTSP `OPTIONS`(`RtspProbeClient`,回 401 也算活);连续失败达阈值才判离线 |

- 代理流到达与周期探测都先比对当前状态,只在**翻转**时调 `updateDeviceLiveness`;稳态不写库(写一次会连带刷缓存、联动通道)。
- 配置:`video.liveness-probe.interval-ms`(默认 300000)、`video.liveness-probe.failure-threshold`(默认 3)。
- 连续失败计数放 Redis(`LivenessFailureCacheKeyBuilder`,按租户 + 设备分 field),TTL = 间隔 ×(阈值 + 1),探通即删。**不要**加全局清理(会跨租户抹掉计数),也不要改回进程内 Map(逐租户探测互相覆盖,重启清零)。
- 调度在 video-server 的 `ActiveStreamLivenessProbeScheduler`(`@Scheduled`),不是 XXL-Job:探测实现在 biz-protocol,执行器 classpath 上没有。
- 多副本各跑一份,按节点表 `LivenessProbeNodeManager` 分片:在线节点按 `nodeId` 排序,下标即分片号。节点死活看 field 上的 `registerTime`(超过「间隔 × 2 + 60 秒」摘除),**不能靠 key TTL**:Hash 过期是整 key 级,任一副本续期就把死节点一起续上。副本拿到租户列表后才注册自己。

## ⚠️ 反幻觉

- hook 开放面属于 anytenant 高危面:改动须按安全基线声明暴露原因,租户解析失败一律拒绝。认证靠每节点 Hook 凭据,不是直接比对 `secret`;组织上下文只取库里的媒体节点行,不要改成从凭据或请求参数里取。
- RTSP / ONVIF / JT1078 是**接入协议**,落库后的设备 / 通道仍是统一的 `video_device` / `video_channel` 模型。
- 没有 ISUP 接入(`video/isup` 已删),别再按 ISUP 找类。
- 厂商差异的适配点在 GB28181 侧(`DeviceAdapter` / `VendorProtocolAdapter`),见 [gb28181.md](gb28181.md)。
