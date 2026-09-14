# 视频媒体资源(SSRC / RTP 端口 / 会话缓存 / 录像)

点播、回放、下载、级联都会占用媒体节点上的资源,这些资源记在 Redis 里跨副本共享。泄漏的典型表现是 SSRC 或端口耗尽、流停不下来。总览见 [video.md](video.md),状态与事件见 [runtime-state.md](runtime-state.md)。

## 资源一览

| 资源 | 管理类 | Redis 结构 |
| --- | --- | --- |
| 入站 SSRC 池 | `SsrcPoolService` → `SsrcPoolManager` | 每个媒体节点一个 Hash:field = SSRC,value = `free` 或占用者(`设备:通道`) |
| SSRC 事务 | `SsrcTransactionManager` | Hash:key = 设备编号,field = Call-ID,value = `SsrcTransaction` |
| RTP 接收端口 | `RtpPortService` → `RtpPortManager` | Hash:key = 媒体节点,field = 端口,value = `free` 或占用者 |
| 流信息 | `StreamInfoService` → `StreamInfoManager` | Hash:key = 设备编号,field = `通道_流类型`,value = `StreamInfo` |
| 出站 RTP(级联推给上级) | `SendRtpInfoManager`、`SendRtpPortManager`、`CachePlusOutboundSsrcStore`、`OutboundRtpResourceLeaseCoordinator` | 每租户一个会话 Hash,field 由媒体节点 + SSRC 组成 |
| 断流重试计数 | `StreamRecoveryCounterManager` | 副本间共享的重试次数 |
| Hook 订阅 | `HookSubscribe` | Redis 存元数据(TTL 5 分钟)+ 本地 Map 存回调(lambda 不可序列化) |

- SSRC / RTP 端口 / 流信息 / SSRC 事务这类 Manager 只做 Redis 读写、不依赖 SIP 栈,所以放在 biz,执行器也能用。
- 部分 Manager 不带 `@DS`(如 `SipInviteSessionManager`),调用前必须先 `ContextUtil.setTenantId(...)`。

## SSRC 与端口

- **SSRC 是 10 位十进制**:第 1 位 `0` 实时流 / `1` 历史流;第 2–5 位是 SIP 域后 4 位;第 6–10 位是序号(每类 9999 个)。每个媒体节点一个池,节点注册时初始化。
- `allocateSsrc` 按前缀直接取一个空闲项;池耗尽发 `SsrcPoolExhaustedEvent` 并抛 `BizException`。分配 / 释放**以 manager 的结果为准**:观测事件发失败只告警,不能让调用方丢掉回收凭据。
- **RTP 接收端口**按节点的 `rtpPortRange` 初始化,**只用偶数**(RTCP = RTP + 1),耗尽抛业务异常。
- **出站发送端口**只取节点的 `sendRtpPortRange`,**不回退**到接收端口范围;初始化、分配、释放都在「租户 + 媒体节点」锁下完成。
- **对账**:XXL `ssrcPoolReconcileJobHandler`(建议 60 秒)先经 video-server 恢复出站 RTP 会话(WAIT_ACK / STARTING / SENDING / 终态),再对账当前租户的入站 SSRC、出站 SSRC 与发送端口,两步独立执行、聚合失败。出站资源有 165 秒保护窗,正常时名义回收时间约 225 秒。
- 手动入口:`POST /admin/video/ssrc/reconcile/{mediaIdentification}`、`POST /admin/video/ssrc/reset/{mediaIdentification}`、`GET /admin/video/ssrc/available/{mediaIdentification}`。

## 点播 / 回放 / 下载

- **准入先于副作用**:回放、下载、设备录像查询共用 `PlaybackRequestGuard`,它只读设备 / 通道,不分配资源、不写缓存、不发 SIP。调用方必须在任何 SSRC、RTP、会话或信令副作用**之前**调用。
- 回放接口 `/playback/start|stop|pause|resume|speed|seek|recordQuery|deviceRecordList`。暂停 / 恢复 / 倍速 / 拖动只有 GB28181 与 JT/T 1078 实现,RTSP / ONVIF 调用会抛 `UnsupportedOperationException`。下载 `/download/start|stop`(设备端录像下载,支持倍速与进度)。
- JT/T 1078 的下发是异步的:`StreamReadyAwaiter` 等流就绪事件回填取流地址,给上层与国标「等 200 OK」一致的同步语义(超时 `stream-ready-timeout-millis`,默认 15 秒)。
- `StreamEventListener` 处理 `PlayRequested` / `StreamReady` / `StreamClosed` / `PlayFailed` / `RtpPortAllocated` / `RtpPortReleased`,异步执行时由 `ContextAwareExecutor` 带上租户上下文。
- **断流自动恢复** `StreamAutoRecoveryListener`:听 `StreamClosedEvent`,最多重试 3 次,间隔 5 / 10 / 20 秒,计数放 Redis 在副本间共享。

## 录像

| 类型 | `planType` | 怎么录 |
| --- | --- | --- |
| 云端录像 | `1` | 录在媒体节点上,计划必须带 `mediaIdentification`。`on_record_mp4` → `MediaRecordMp4EventListener` 从节点下载文件 → 经 base 文件服务上传对象存储 → 写 `video_record_file`(带 `fileId`) |
| 设备端录像 | 其他值 | 设备自己存盘,不经过媒体节点;计划必须绑定设备与通道,且接入协议 `supportsDeviceRecordControl()`,建计划时也要过设备数据范围闸门 |

- **调度**:XXL `executeRecordPlanScheduleJobHandler` 扫描启用的计划,按 `scheduleRule` 判断当前是否在录制窗口内;同一计划在多个执行器实例间加锁,抢不到的实例跳过。
- **设备端录像只在窗口边界各下发一次**:国标只有 RecordCmd 这个开关,没有「是否在录」的查询,状态记在 `DeviceRecordStateManager`。设备确认收到命令后才翻转,下发失败下一轮自然重试;读状态失败按「未开录」重发(设备侧幂等)。
- **`scheduleRule`(JSON,解析在 `RecordScheduleRule`)**:`{"type":"always"}` 全天,规则为空同样按全天;`{"type":"weekly","days":[1,2,3,4,5],"startTime":"08:00:00","endTime":"18:00:00"}` 按周(结束早于开始表示跨天);`{"type":"cron","cron":"0 0 8 * * ?","duration":36000}` 每次触发后录 `duration` 秒(cron 六段:秒 分 时 日 月 周)。保存和启用计划时校验规则,写错直接报错;调度时遇到无效规则一律**不录**。
- **补传**:上传失败的记录 `fileId` 为空、文件还压在节点本地,`retryRecordFileUploadJobHandler` 重新下载并上传,成功后删掉节点上的本地副本(日志 `[录像本地回收]`)。
- **过期清理**:`cleanExpiredRecordFilesJobHandler` 按计划的 `retentionDays` 删除超期文件。
- 截图不走录像:`GET /play/snapshot` 只截正在推的流,见 [media-access.md](media-access.md)。
