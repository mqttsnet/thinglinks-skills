# 流媒体接入与多协议(ZLM hook / ISUP / JT1078 / 厂商适配)

GB28181 之外的接入与媒体回调面。信令层见 [gb28181.md](gb28181.md),总览见 [video.md](video.md)。

## ZLM hook(媒体事件入站)

- 入口:controller `anytenant` 开放面 `/video/zlmHook/anyTenant/index/hook/{type}`;`HookTypeEnum` 枚举回调类型(`on_publish` / `on_play` / `on_stream_changed` / `on_stream_none_reader` / `on_record_mp4` / server start/keepalive…)。
- 处理模式:hook → 解析租户(`mediaServerId@<tenantId>`)→ 转 **Spring 事件**(`media/zlm/event/HookZlmServer*Event`、`media/server/event/hook/{HookData,HookSubscribe}`)→ biz `manager/hook` 与各域 listener 消费。新增回调行为 = 加 listener,不改 hook 入口。

## stream / record 域

- `manager/stream` + `service/...`:推流(push)、拉流代理(proxy,RTSP 经 ZLM `addStreamProxy`)、播放会话;流就绪/关闭走 `StreamReadyEvent` / `StreamClosedEvent`。
- `manager/record` + `video_record_plan` / `video_record_file`:录制计划调度(XXL-Job)与文件登记;MP4 文件元数据注册到 base 服务 File 库。

## ISUP(海康 Ehome)

`video/isup/`:`sdk/IsupSdkAdapter`(SDK 桥接)+ `sdk/IsupDeviceCallback`(设备回调)+ `cmd/{IsupPlayCommander,IsupPtzCommander,IsupAlarmCommander}` + `config/IsupConfig`;biz 侧 `manager/isup`。模式与 GB 的 cmd 对齐:指令封装在 Commander,业务在 manager。

## JT1078(车载)

`enumeration/jt1078/{StreamType,ChannelType,DeviceStatus,CommandType}Enum` + `dto/jt1078/Jt1078ConnectionInfo`,biz 侧 `manager/jt1078`;缓存键域 `common/cache/video/jt1078`。

## 厂商/版本适配(SPI 两层)

- **国标版本**:`gb28181/protocol/GbProtocolAdapter` → `Gb2016ProtocolAdapter` / `Gb2022ProtocolAdapter`。
- **厂商差异**:`video/protocol/VendorProtocolAdapter` + `VendorProtocolAdapterFactory`(server 侧有对应测试)——厂商私有行为收敛在 adapter,新厂商 = 新实现注册,不改信令管线。

## ONVIF

controller 独立 `onvif` 域(设备发现/取流地址),走 ZLM 代理拉流,不参与 GB 信令。

## ⚠️ 反幻觉

- hook 开放面属于 anytenant 高危面:改动须按安全基线声明暴露原因(校验 `secret`、租户解析失败拒绝)。
- ISUP/JT1078 是**接入协议**,落库后的设备/通道仍是统一 `video_device`/`video_channel` 模型。
