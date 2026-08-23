# 流媒体(thinglinks-video)总览

独立的 **GB/T 28181 视频平台**:自研 JAIN-SIP 栈做信令,前置 **ZLMediaKit / ABLMediaServer** 媒体集群转流。**与 IoT 设备模型完全独立**(自有 `VideoDevice`/`VideoChannel`,不依赖 thinglinks-link、不走 MQTT 总线)。

## 模块拆分(协议层独立)

| 子模块 | 职责 |
| --- | --- |
| `thinglinks-video-biz-protocol` | **GB28181 信令层**:transmit 管线、信令事件体系(19 类事件)、cmd、级联、会话/SSRC、Gb2016/2022 适配 → [gb28181.md](gb28181.md) |
| `thinglinks-video-biz` | 业务层 manager/service/mapper/cache,域:device / gateway / group / media / platform / record / sip / ssrc / stream / hook / isup / jt1078 |
| `thinglinks-video-entity` | 实体/VO/枚举(`enumeration/{gb28181,stream,device,media,hook,jt1078}`,历史误名 empowerment 已更正) |
| `thinglinks-video-controller` | REST + 开放面(`anytenant` ZLM hook 回调);onvif / admin 域 |
| `thinglinks-video-facade` / `-server` | Facade(仅 boot-impl 有实现)/ 启动器 |

## 能力 / 协议

- 实时点播、回放、录像(计划+按需)、下载、PTZ、语音对讲/广播。
- 接入:`GB28181`(主,双版本 `Gb2016/Gb2022ProtocolAdapter`)/ `ISUP`(海康 Ehome)/ `JT1078`(车载)/ `ONVIF` / `RTSP` 代理 → 细节见 [media-access.md](media-access.md)。
- 播放输出:RTMP / RTSP / HLS / FLV / WS-FLV / WebRTC(`MediaNodeService.buildStreamUrls()`)。

## 媒体服务器:控制面 + 双向对接

`media/common/MediaNodeService`(抽象)+ Factory 按 `VideoMediaServer.type`(`zlm`|`abl`)选实现。出站 `ZlmRestClient`(带 `secret`,可重试);入站 ZLM HTTP hook(`/video/zlmHook/anyTenant/index/hook/{type}`,从 `mediaServerId@<tenantId>` 解析租户 → 转 Spring 事件)。

## 关键流程(结论)

- **点播** `PlayService.doPlay`:分布式锁(device,channel)→ 复用检查 → 选节点 → 分配 SSRC+RTP 端口 → `openRtpServer` → SIP INVITE(异步等 200 OK,10s)→ 存 `SsrcTransaction` → 出多协议 URL;空闲 `on_stream_none_reader` → stop(BYE+释放)。
- **设备/通道**:不手填,由 GB28181 **Catalog** 应答同步入库(`video_device`/`video_channel`)。

## 数据 / 部署 / 多租户(结论)

| 维度 | 结论 |
| --- | --- |
| 表基线 | `video_device`/`video_channel`(取代旧 info/channel 双表)、`video_device_alarm`、分组双表、`video_gateway_mapping`、级联三表、`video_record_plan/file`、`video_notify_subscription`、`video_sip_config`(SIP 密码 AES) |
| 部署 | 独立 server(path `/video`);facade **无 cloud 双实现**(`video-cloud-impl` 模块在,但没有实现类);定时任务走 **XXL-Job** |
| 上行来源 | 设备 SIP/RTP + ZLM hook,**不走 MQTT/Kafka 总线** |
| 推前端 | 原生 WebSocket(JSR-356,租户隔离:`WebSocketAuthGuard.requireSameTenant`) |
| 多租户 | `@DS(BASE_TENANT)` 动态数据源;hook 按 `@<tenant>` 后缀解析;SSRC/RTP 端口池 + 分布式锁保证集群安全 |
| 缓存键域 | `common/cache/video/{device,media,hook,isup,jt1078,platform,sip×5,ssrc,stream,subscribe}` + `common/lock/video` |

## ⚠️ 反幻觉

- video 不是 IoT 设备的一部分,别与 link 物模型/MQTT 上行混谈。
- 信令类(SIPSender/SIPProcessorObserver/transmit 一族)在 **biz-protocol** 模块,不在 biz。
- 旧 `VideoDeviceInfo*`/`VideoDeviceChannel*` 全家已删,按新 `device` 域类名找。
- 媒体能力来自 ZLM/ABL,本模块是控制面;转流/录制由媒体服务器执行。
