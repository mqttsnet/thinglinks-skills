# 视频问题排查(按用户看到的现象)

先判断卡在哪个阶段,再按阶段对照。接入步骤本身见 [device-onboarding.md](device-onboarding.md),状态模型见 [runtime-state.md](runtime-state.md),媒体资源见 [stream-resources.md](stream-resources.md)。

视频链路是**单向可达**的四段,多数「没画面」是其中一段不通,而且**不报错**:

| 段 | 方向 | 协议 | 作用 |
| --- | --- | --- | --- |
| ① | 设备 → 媒体节点 | RTP(UDP/TCP) | 推流(JT/T 1078 例外:终端 → 平台 media 端口,平台再转推) |
| ② | 媒体节点 → 平台 | HTTP hook(经网关) | 流上下线、录像完成、节点心跳 |
| ③ | 平台 → 设备 / 媒体节点 | SIP、JT808、ZLM openAPI | INVITE / BYE / PTZ、拉流代理、查询 |
| ④ | 浏览器 → 媒体节点 | HTTP-FLV / WS-FLV / HLS / WebRTC | 前端拉流,不经过平台 |

## 0. 平台本身没就绪

| 现象 | 判据 / 处理 |
| --- | --- |
| 「接入协议」页显示协议不可用 | 页面直接给原因,常见是端口被占用或网卡扫描不到地址;看启动日志 `[SIP]` / `[JT808]` / `[JT1078]` |
| 「SIP 节点」页没有在线节点 | 检查 Redis 连接与节点心跳 |
| 媒体节点一直离线,可 hook 能到 | 离线只由心跳任务判(平台 → 节点 `getServerConfig`,日志 `[ZLM-心跳失败]` / `[ZLM-状态翻转]`),hook 只能把节点写成在线。平台到节点的 openAPI 不通(NAT / 防火墙 / 容器单向可达)就会反复判离线;用「测试连接」确认 |

## 1. 注册不上 / 上不了线

| 现象 | 判据 / 处理 |
| --- | --- |
| GB28181 设备注册一直 401 | 401 是正常挑战;设备收到后仍不带认证重发,多半是设备没填注册密码 |
| GB28181 注册回 403 wrong password | 口令或 SIP 服务器编号不对。设备档案设了「认证凭据」时校验的是它,不是 SIP 配置的共享口令 |
| GB28181 注册回 403(无原因) | 来源 IP 不在「注册IP白名单」里(日志 `[SIP白名单] 拒绝注册`),按设备真实来源地址判 |
| GB28181 注册回 403 auto register disabled | 该 SIP 配置关闭了自动建档(「SIP 接入配置」的「允许自动建档」),先在设备台账里登记这个编号 |
| 下级平台注册被拒 | 登记成平台(`deviceRole = PLATFORM`)但没设独立口令,平台不回落共享口令 |
| 平台日志「未找到租户配置」 | 设备上的 SIP 服务器编号 / 域与平台配置对不上,或路由缓存没刷新(「SIP 接入配置」页点「刷新缓存」) |
| JT1078 终端注册回 `0x04` | 平台没建档,或设备标识与终端手机号不一致;建档后才会写入「手机号 → 租户」索引 |
| JT1078 注册成功但一直不在线 | 鉴权码不匹配被断链(日志 `[JT808] 鉴权码不匹配`);鉴权码是设备档案的「认证凭据」,留空时等于手机号 |
| 设备上线后很快又离线 | 保活超时:最近心跳距今超过「心跳间隔 × 超时次数」(缺省 60 秒 × 3)。核对设备侧心跳周期是否比平台配置长,心跳报文能不能到平台 |
| 在线 / 离线来回跳,或迟到的状态覆盖了新状态 | 日志 `[设备存活] CAS 拒绝` 是迟到事件被正确丢弃,不是故障 |

## 2. 在线了,但没有通道

| 现象 | 判据 / 处理 |
| --- | --- |
| GB28181 设备在线,通道列表为空 | 设备没应答 Catalog。点「同步目录」(`POST /videoDevice/syncCatalog`),看日志 `[Catalog全量]` |
| 大路数 NVR / 下级平台目录一直不同步 | 通道数超过自动建档上限(缺省 64)被挂起,日志「通道数超出自动建档上限」:NVR 在「SIP 接入配置」调高「自动建档通道数上限」,下级平台先登记成平台 |
| 通道名是乱码 | 设备档案的字符集(GB2312 / UTF-8)与设备实际编码不一致 |
| JT1078 设备没有通道 | 设备档案的「通道数」为空(接口建档时漏填的存量数据),编辑设备填上通道数保存即补出通道 |

## 3. 点播没画面

| 现象 | 判据 / 处理 |
| --- | --- |
| 报「设备未应答 INVITE(超时 10000ms)」 | INVITE 等 200 OK 固定 10 秒。抓 5060 看有没有 200 OK;设备不在线或 SIP 不通 |
| 设备回 200 OK 后立刻 BYE,前端一直转圈 | 日志 `[平台 SIP ID 不一致]`:平台 `sipId` 与设备编号相同或填错 |
| INVITE 成功,前端一直转圈 | 段 ① 或 ② 不通:媒体节点上抓收流端口有没有包,平台有没有收到 `on_stream_changed`。设备到不了媒体节点的「SDP地址」、跨 NAT 没放通收流端口段都是这个现象 |
| 拿到了播放地址,浏览器放不出来 | 段 ④ 不通:浏览器到不了媒体节点的「流播放地址」或端口;看浏览器 Network 里 FLV / HLS / WS 请求的状态码 |
| hook 全部 401 | 节点关闭了「是否开启自动配置」,Hook 凭据激活不了(心跳日志 `[ZLM-心跳] 节点未开启自动配置`):编辑节点打开自动配置。保存与编辑不允许 ZLM 节点关闭它,这种情况只出现在库里的存量数据上。503 是 Redis 或数据库不可用 |
| hook 根本回不来 | 节点「Hook回调地址」不合法会回落全局前缀(日志「DB hookHost 不满足安全 Hook URL 约束」);换网后节点里存的旧地址会让回调全部失败。到媒体节点所在机器上直接请求一次网关地址 |
| RTSP / ONVIF 设备点播失败 | 拉流的是媒体节点:在它所在网络用 ffplay 拉一次设备地址;日志 `[RTSP拉流]`。代理注册失败会顺手把设备置离线 |
| RTSP / ONVIF 设备断网了还显示在线 | 看存活探测是否在跑(日志 `[存活探测]` / `[RTSP 存活探测]`),连续失败 3 次(缺省每 5 分钟一次)才判离线,见 [media-access.md](media-access.md) |
| ONVIF 扫描不到设备 | video-server 与摄像机不在同一个二层网段,或跑在容器 bridge 网络里收不到组播 |
| ONVIF 加载码流报认证失败 | 账号密码错,或设备时间与平台偏差太大(UsernameToken 带时间戳),先让设备对时 |
| JT1078 下发预览成功,没画面 | `media-port` 没配或 `media-ip` 与 `sip.public-host` 都为空;终端到不了平台 media 端口;多副本时请求落到了不持有终端连接的副本 |
| 有画面没声音 | `on_publish` 应答里 `enable_audio` 被置 false 会丢掉整条音频轨;再核对设备本身是否开启音频编码 |

## 4. 回放 / 录像

| 现象 | 判据 / 处理 |
| --- | --- |
| 没有「从设备回放」入口 | 能力位按台判定:RTSP 要配「设备侧回放地址模板」,ONVIF 要设备支持 Profile G |
| 回放暂停 / 倍速 / 拖动报不支持 | 只有 GB28181 与 JT1078 实现,RTSP / ONVIF 不支持 |
| 录像计划一直不录 | 调度规则无效时一律不录(日志「调度规则无效，本计划不录制」),保存和启用计划时会直接提示原因;云端录像计划没带「关联流媒体标识」也不会录 |
| 设备端录像计划保存报错 | 必须绑定设备与通道,且接入协议支持设备端录像 |
| 云端录像有记录但没有文件 | 上传对象存储失败,`fileId` 为空,等 XXL `retryRecordFileUploadJobHandler` 补传 |

## 5. 云台 / 对讲 / 告警 / 推送

| 现象 | 判据 / 处理 |
| --- | --- |
| 云台、对讲按钮不出现或调用报不支持 | 看 `GET /videoDevice/capability` 的 ptz / broadcast;协议不支持的操作会抛不支持 |
| ONVIF 告警重启后收不到 | 订阅是进程内状态,由对账任务重建(缺省启动 60 秒后开始,每 5 分钟一轮) |
| 前端收不到设备状态 / 告警推送 | 端点 `/anyone/videoSocket/{deviceStatus,alarm}/{tenantId}` 按租户校验;推送方与连接持有方可以不在同一节点,走集群路由 |
| 多副本下挂断丢失、流停不下来 | 每个副本的 `SIP_PUBLIC_HOST` 要填各自对设备可达的地址,不能共用负载均衡地址 |
| SIP 报文被回 413 | MESSAGE 的 `Content-Length` 缺失、不一致或超过 body 上限(缺省 512 KiB),在租户路由之前就被拒 |

## 配置清单(Nacos `thinglinks-video-server.yml`)

| 配置 | 默认 | 说明 |
| --- | --- | --- |
| `server.port` | 18796 | |
| `sip.port` | 5060 | UDP + TCP,所有租户共用 |
| `sip.public-host` / `sip.public-port`(`SIP_PUBLIC_HOST` / `SIP_PUBLIC_PORT`) | 空 | 本副本对设备可达的地址;多副本各填各的。不在本机网卡上是正常的(云 / NAT / 容器) |
| `sip.register-time-interval` | 60 | 向上级平台注册失败后的重试间隔(秒) |
| `sip.user-settings.sip-stack-max-message-size-bytes` / `sip-message-body-max-size-bytes` | 1 MiB / 512 KiB | 整条 SIP 报文 / MESSAGE body 上限,超限回 413,改完要重启 |
| `media.hook-domain-prefix`(`VIDEO_HOOK_DOMAIN_PREFIX`) | `http://127.0.0.1:18760/video/anyTenant/zlmHook/index/hook` | 全局 hook 前缀;媒体节点上填了合法的 `hookHost` 就用节点自己的 |
| `media.media-rest.*` | 连接 5000ms、读 10000ms、重试 3 次(1s 起,×2) | 平台调 ZLM / ABL openAPI |
| `thinglinks.video.jt1078.signal-port` / `media-port` / `media-ip` / `talk-receive-host` | 模板里 5061 / 5062 / 空 / 空 | 代码默认 `signal-port` 7611、`media-port` 无;`media-ip` 留空回落 `sip.public-host` |
| `notify.domain` | 空 | 告警通知模板里的 `${sys.domain}`,留空渲染成空串,支持热更新 |
| `video.liveness-probe.*` / `video.jt1078.tenant-index-reconcile-*` / `video.onvif.alarm-reconcile-*` / `video.tenant-lookup.*` | 见代码 `@Value` | video-server 进程内定时任务的周期、阈值与取租户重试 |

## 运维接口

| 接口 | 用途 |
| --- | --- |
| `GET /protocolAccess/list` | 各协议是否可用、监听地址端口、接入步骤 |
| `GET /videoMediaServer/testConnection` | 测平台到媒体节点 openAPI 的连通 |
| `GET /videoMediaServer/realTimeMetrics/{id}` | 节点实时指标 |
| `POST /videoDevice/syncCatalog`、`/batch/syncCatalog` | 手动触发国标目录同步 |
| `POST /videoDevice/forceOffline`、`/batch/forceOffline` | 强制下线 |
| `GET /videoDevice/capability` | 这台设备支持哪些操作入口 |
| `GET /streamMonitor/list`、`/streamMonitor/overview` | 在线流清单与概览 |
| `POST /admin/video/ssrc/reconcile/{mediaIdentification}`、`POST .../reset/{mediaIdentification}`、`GET .../available/{mediaIdentification}` | SSRC 池对账 / 重置 / 查可用数 |

## 日志锚点

按域搜前缀:`[JT1078]` / `[JT808]`、`[国标级联]` / `[平台注册]` / `[平台级联]`、`[ONVIF]` / `[ONVIF 导入]`、`[Catalog全量]` / `[CatalogNotify]`、`[ZLM]` / `[ABL]` / `[媒体服务节点]` / `[媒体API重试]`、`[SIP]` / `[SIP白名单]` / `[Keepalive]` / `[心跳监控]`、`[设备存活]`、`[存活探测]`、`[RTSP拉流]` / `[拉流代理]`、`[SSRC对账]`、`[流恢复]` / `[流复用失效]`、`[设备对讲]` / `[对讲]`、`[HookSubscribe]`、`[WS-设备状态]` / `[WS-媒体指标]`、`[录像本地回收]`、`[回放控制]`。

## 测试

- 协议隔离:`video-server` 的 `architecture/ProtocolIsolationTest` 守「协议之间不互相 import」。
- Redis 门禁用例带 `@EnabledIfSystemProperty(named = "thinglinks.redis.integration", matches = "true")`,不开开关时**静默跳过** —— 构建全绿不代表这些判据通过,要看 surefire 报告里的 skipped 数。开启时同时给 `-Dthinglinks.redis.host` / `-Dthinglinks.redis.port`(集群用例另要 `thinglinks.redis.cluster.nodes` / `username` / `password`)。
- 在 zsh 里别把多个 `-D` 参数塞进一个变量再展开:不分词,整串会被当成一个参数,开关随之失效。
