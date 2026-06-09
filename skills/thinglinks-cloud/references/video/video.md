# 流媒体(thinglinks-video)

独立的 **GB/T 28181 视频平台**(非薄模块,~800 类):自研 JAIN-SIP 栈做信令,前置 **ZLMediaKit / ABLMediaServer** 媒体集群转流。**与 IoT 设备模型完全独立**(自有 `VideoDevice`/`VideoChannel`,不依赖 thinglinks-link、不走 MQTT 总线)。

## 能力 / 协议

- 能力:实时点播、回放、录像(计划 + 按需)、下载、PTZ、语音对讲/广播。
- 接入协议:`GB28181`(主)/ `ISUP`(海康 Ehome)/ `JT1078`(车载)/ `ONVIF` / `RTSP`(经 ZLM `addStreamProxy` 代理)。GB 双版本 `Gb2016/Gb2022ProtocolAdapter`(`GbProtocolAdapterFactory`)。
- 播放输出多协议:RTMP / RTSP / HLS / FLV / WS-FLV / WebRTC(`MediaNodeService.buildStreamUrls()`)。

## 媒体服务器:控制面 + 双向对接

`media/common/MediaNodeService`(抽象)+ `MediaNodeServiceFactory`(按 `VideoMediaServer.type` = `zlm`|`abl` 选实现,默认 ZLM)。
- **出站 HTTP**:`ZlmRestClient`(调 ZLM `index/api/*`,自动带 `secret`,`RetryableMediaRestClient` 重试)→ `ZlmMediaNodeServiceImpl`。
- **入站钩子**:`controller/anytenant/ZlmHookAnyTenantController`,收 ZLM HTTP 回调 `/video/zlmHook/anyTenant/index/hook/{type}`(`on_publish`/`on_play`/`on_stream_changed`/`on_stream_none_reader`/`on_record_mp4`…),从 `mediaServerId` 的 `@<tenantId>` 后缀解析租户 → 转 Spring 事件(`MediaPublishEvent`/`MediaArrivalEvent`/`MediaRecordMp4Event`…)。

## 关键流程

- **点播**(`PlayService.doPlay`):分布式锁(device,channel)→ 复用检查 → 选 `VideoMediaServer` → 分配 SSRC + RTP 端口 → `createRtpServer`(ZLM `openRtpServer`)→ `PlayCommander.playInvite`(SIP INVITE,异步)→ 等 200 OK(10s)→ 存 `SsrcTransaction` → 生成多协议播放 URL。空闲时 ZLM `on_stream_none_reader` 回调 → `playService.stop`(BYE + 释放 SSRC/端口)。
- **设备/通道**:不手填,从 GB28181 **Catalog** 响应同步(`CatalogNotify/QueryMessageHandler` → `VideoChannelManager`)。

## 数据 / 部署 / 集成(结论)

| 维度 | 结论 |
| --- | --- |
| 设备模型 | `VideoDevice`(`video_device`,GB 编码)/ `VideoChannel`(`video_channel`),**与 IoT 设备/产品无关**(零 link 依赖) |
| 部署 | 独立 `thinglinks-video-server`(Nacos,path `/video`);facade 仅 boot-impl,**cloud-impl 空壳(无 Feign 双实现)**;定时任务走 **XXL-Job**(`VideoJobHandlerFacade`:心跳/录像计划/SSRC 对账…) |
| 上行来源 | 设备 SIP/RTP + ZLM 钩子,**不走 MQTT/Kafka 总线** |
| 推前端 | 原生 WebSocket(JSR-356,租户隔离):告警 `/anyone/videoSocket/alarm/{tenantId}`、设备状态、媒体指标(`VideoWebSocketSessionHolder`、`WebSocketAuthGuard.requireSameTenant`) |
| 录像存储 | 元数据 `video_record_file`;MP4 文件注册到 **base 服务 File 库**(`FileFacade`) |
| 多租户 | `@DS(BASE_TENANT)` 动态数据源;钩子按 `mediaServerId@<tenant>` 解析租户;租户级 SIP 配置缓存 Redis;集群安全 SSRC/RTP 端口池 + 分布式锁 |

## ⚠️ 反幻觉

- video **不是 IoT 设备的一部分**,别和 thinglinks-link 物模型/MQTT 上行混为一谈 —— 独立 GB28181 平台。
- 部署是独立 server + XXL-Job,**没有** cloud Feign 双实现(cloud-impl 空壳)。
- 媒体能力来自 ZLM/ABL,本模块是**控制面**;转流/录制由媒体服务器做。
- 类名/路径随版本演进,核对真实代码 `com.mqttsnet.thinglinks.video.*`。
