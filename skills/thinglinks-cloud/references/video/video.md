# 流媒体(thinglinks-video)总览

独立的视频平台:自研 JAIN-SIP 栈做 GB28181 信令,另接 ONVIF / RTSP / JT/T 1078;媒体面交给 **ZLMediaKit / ABLMediaServer** 集群。**与 IoT 设备模型完全独立**(自有 `VideoDevice`/`VideoChannel`,不依赖 thinglinks-link、不走 MQTT 总线)。

服务名 `thinglinks-video-server`,HTTP 18796,网关前缀 `/video`,WebSocket `/wsVideo`;SIP 5060(UDP + TCP)**所有租户共用**。

## 模块拆分(协议层独立)

| 子模块 | 职责 |
| --- | --- |
| `thinglinks-video-biz-protocol` | **进程绑定**的协议栈与依赖协议 bean 的服务:`gb28181/`(→ [gb28181.md](gb28181.md))、`jt1078/`、`onvif/`、`protocol/`(多协议 SPI)、`service/stream`(点播 / 回放 / 下载 / 广播对讲 / 截图 / RTSP 拉流 / 存活探测)、`service/device`(设备控制 / PTZ / 预置位查询) |
| `thinglinks-video-biz` | 协议无关业务:manager / service / mapper,域 device / gateway / group / media / platform / record / sip / ssrc / stream / hook / jt1078 / audio,另有 `notify`(告警通知)、`ws`(状态与告警推送)、`metrics` |
| `thinglinks-video-entity` | 实体 / VO / DTO / 缓存 VO / 枚举(`enumeration/{gb28181,stream,device,media,hook,jt1078}`) |
| `thinglinks-video-controller` | REST、`anyTenant` ZLM hook 回调、4 个 `/inner/video*` 服务间接口(录像流、录像设备控制、订阅续订、出站 RTP 恢复) |
| `thinglinks-video-facade` | api;boot-impl(`VideoJobHandlerFacadeImpl` + `Local*OpenInnerFacadeImpl`,执行器进程内直调);cloud-impl(`Remote*OpenInnerFacadeImpl`,HTTP Interface 调 video-server) |
| `thinglinks-video-server` | 启动器 + `startup/` 下的进程内定时任务与启动任务 |

- **放哪个模块的判据**:要注入 `SIPSender` / `Commander` / `SipLayer` 这类协议 bean 的,放 biz-protocol。
- iot-executor 只引 video-boot-impl → video-biz,**不能引 biz-protocol**(`SipLayer` 等启动器会在执行器里跑起来)。反过来,biz 里的 `@EventListener` 会被加载进执行器进程,所以不得注入协议 bean。
- 协议之间不许互相 import,共用的东西上提到协议包之外(`ProtocolIsolationTest` 守着)。

## 多协议接入(SPI)

业务层只看设备的 `accessProtocol`,经 `DeviceAccessProtocolFactory` / `DeviceProtocolResolver` 路由到 `DeviceAccessProtocol` 的实现(`Gb28181` / `Rtsp` / `Onvif` / `Jt1078AccessProtocol`);协议不支持的操作默认抛 `UnsupportedOperationException`。

| 协议 | 模型 | 媒体面 |
| --- | --- | --- |
| GB28181 | 设备 REGISTER → SIP INVITE 协商 | 设备直推媒体节点 |
| RTSP | 平台调 `addStreamProxy` | 媒体节点去拉 |
| ONVIF | WS-Discovery → SOAP `GetStreamUri` → 按 RTSP 拉 | 同 RTSP |
| JT/T 1078 | JT808 TCP 信令 + 平台收流 | **平台转封装成 PS 后推给媒体节点** |

- **能力位**:前端给不给入口看 `GET /videoDevice/capability`(realPlay / playback / deviceRecordSearch / ptz / broadcast)。回放与设备录像检索是**逐台**判定(`supportsPlayback(deviceIdentification)`):ONVIF 的 Profile G 可选,RTSP 要配了 `playbackUrlTemplate` 才算支持。
- 各协议细节(Hook 凭据、JT1078、ONVIF、RTSP、主动拉流设备的在线状态)见 [media-access.md](media-access.md)。
- 设备接入步骤见 [device-onboarding.md](device-onboarding.md);在线状态与事件见 [runtime-state.md](runtime-state.md);SSRC / RTP 端口 / 录像等媒体资源见 [stream-resources.md](stream-resources.md);排查见 [troubleshooting.md](troubleshooting.md)。

## 能力

实时点播、回放(云端 MP4 + 设备侧)、下载、PTZ(方向 / 调焦 / 光圈 / 绝对与相对定位)、预置位(`/ptz/preset/*`)、截图(`GET /play/snapshot`,只截**正在推**的流,不按需拉流)、语音广播与对讲(`/broadcast`,`TalkProtocolStrategyRegistry` 按协议分派 GB28181 / JT1078)、移动位置、报警、设备订阅、国标级联。
播放输出 RTMP / RTSP / HLS / FLV / WS-FLV / WebRTC(`MediaNodeService.buildStreamUrls`)。

## 媒体服务器:控制面 + 双向对接

`media/common/MediaNodeService`(抽象)+ `MediaNodeServiceFactory` 按 `VideoMediaServer.type`(`zlm`|`abl`)选实现。出站 `ZlmRestClient`(带 `secret`,重试走 `RetryableMediaRestClient`);入站 ZLM HTTP hook(`/video/anyTenant/zlmHook/index/hook/{type}`,从 `mediaServerId@<tenantId>` 解析租户 → 转 Spring 事件)。每台 ZLM 有独立的 Hook 凭据,见 [media-access.md](media-access.md)。每个租户有一个默认媒体节点(`POST /videoMediaServer/{id}/setDefault`)。

## 关键流程(结论)

- **点播** `PlayService.doPlay`:分布式锁(device,channel)→ 复用检查 → 选节点 → 分配 SSRC+RTP 端口 → `openRtpServer` → SIP INVITE(异步等 200 OK,10s)→ 存 `SsrcTransaction` → 出多协议 URL;空闲 `on_stream_none_reader` → stop(BYE+释放)。
- **设备 / 通道从哪来**:GB28181 由 **Catalog** 应答同步入库(`CatalogSyncManager`);RTSP / ONVIF 手工建档或 `POST /onvif/import` 导入(带默认通道);JT/T 1078 **先建档后接入**,未建档终端注册按标准回 `0x04`,不自动建档。
- **在线状态**统一走 `updateDeviceLiveness`(HLC 事件时钟定序),协议包里不自己写库;保活超时置离线由 XXL `deviceKeepaliveTimeoutCheckJobHandler` 负责,接入链路不做超时判断。

## 数据 / 部署 / 多租户(结论)

| 维度 | 结论 |
| --- | --- |
| 表基线 | `video_device` / `video_channel` / `video_channel_preset`、`video_device_alarm`、`video_device_mobile_position`、分组双表(`video_device_group` / `_relation`)、`video_gateway_mapping`、级联三表(`video_platform` / `_catalog` / `_channel`)、`video_record_plan` / `video_record_file`、`video_notify_subscription`、`video_sip_config`(SIP 密码 AES)、`video_media_server`、`video_stream_proxy` / `video_stream_push` |
| 设备档案 | `deviceRole`:`DEVICE`(设备)/ `PLATFORM`(下级平台) |
| 定时任务 | 两处:**XXL-Job**(iot-executor 的 `VideoJob`,清单见 `../system/job-scheduling.md`;常规任务经 boot-impl 本地执行,订阅续订经 cloud-impl 调 video-server)与 video-server 进程内的 `@Scheduled`(SIP 心跳续期、上级平台注册、ONVIF 告警轮询、主动拉流设备存活探测、JT1078 租户索引、ONVIF 告警订阅对账等)。进程绑定的协议逻辑只能放后者 |
| 多副本 | 每个副本要有**设备能直连的独立地址**(`SIP_PUBLIC_HOST` / `SIP_PUBLIC_PORT`),不能藏在负载均衡后面:GB28181 的 BYE 按注册地址原路回,JT1078 按指令里的地址推流,配错**不报错,只是没画面**。**JT/T 1078 目前只能单副本**:终端长连接在进程内的 `Jt808SessionRegistry`,在线状态却在 Redis,多副本会「显示在线、点播失败」。详见模块内 `doc/集群部署.md` |
| 上行来源 | 设备 SIP/RTP、JT808/1078 TCP、ONVIF SOAP、ZLM hook,**不走 MQTT/Kafka 总线** |
| 推前端 | Spring WebSocket(`TextWebSocketHandler`:`DeviceStatusWebSocketHandler` / `AlarmPushWebSocketHandler`,由 `@ServerEndpoint` 迁来),租户隔离 `WebSocketAuthGuard.requireSameTenant` |
| 多租户 | `@DS(BASE_TENANT)` 只标 ServiceImpl(Manager 不标;执行器调用链入口的 StatusManager 例外);GB28181 按 sipId 查 Redis 路由租户(见 [gb28181.md](gb28181.md));JT1078 按手机号查 `def_jt1078_tenant_index`(`Jt1078TenantRouter`,Netty IO 线程复用,用完必须 `clear()`);hook 租户按 `@<tenant>` 后缀解析、组织取库里的媒体节点行;video-server 按租户遍历的任务经 `TenantListLoader` 取租户列表(依赖未就绪时短退避,判据见 `../system/service-rpc.md`);SSRC/RTP 端口池 + 分布式锁保证集群安全 |
| 缓存键域 | `common/cache/video/{audio,device,hook,jt1078,media,platform,record,sip,ssrc,stream,subscribe}` + `common/lock/video` |

## ⚠️ 反幻觉

- video 不是 IoT 设备的一部分,别与 link 物模型/MQTT 上行混谈。
- 信令类(`SIPSender` / `SIPProcessorObserver` / transmit 一族)在 **biz-protocol**,不在 biz。
- 旧 `VideoDeviceInfo*` / `VideoDeviceChannel*` 全家已删,按新 `device` 域类名找。
- **没有 ISUP**,也不接大华 NetSDK 等厂商私有 SDK;海康、大华设备按 GB28181 接入。
- 媒体能力来自 ZLM/ABL,本模块是控制面 —— **JT/T 1078 例外**,平台自己收流、转封装、转推。
- ONVIF / RTSP 设备不注册、不发心跳,被心跳超时扫描整类豁免;它们的在线状态另有来源(代理流到达 + 周期探测),见 [media-access.md](media-access.md)。
