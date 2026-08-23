# 定时任务(XXL-Job:调度中心在另一个工程)

定时任务是 cloud 的一部分,但**调度中心被拆成了独立工程**,执行器留在 cloud 仓里。
排查「某个任务没跑」时两边都要看。

| 角色 | 在哪 | 服务名 / 端口 |
| --- | --- | --- |
| **调度中心** | 独立工程:旗舰 `thinglinks-job-pro`,社区 monorepo 内 `thinglinks-job/` | `thinglinks-job-admin`,18767,context-path `/thinglinks-job-admin` |
| **平台执行器** | cloud 仓 `thinglinks-support/thinglinks-base-executor` | 18900,XXL-RPC 18901 |
| **IoT 执行器** | cloud 仓 `thinglinks-support/thinglinks-iot-executor` | 18910,XXL-RPC 18911 |

调度中心与 cloud **不同版本线**:它有自己的 `.thinglinks-product.env`
(旗舰当前 1.0.9,JDK 25,XXL-JOB 对齐官方 3.4.2),升级 cloud 不会带着它一起升。
社区版由 monorepo 根的 `bump-version.sh` 统一编排(它是五组件之一)。

## 任务清单(按执行器)

**`thinglinks-iot-executor`** —— IoT 与视频的全部周期任务:

| JobHandler | 干什么 |
| --- | --- |
| `flushAnyTenantDeviceCacheJobHandler` | 刷设备缓存 |
| `flushAnyTenantProductCacheJobHandler` | 刷产品缓存 |
| `flushAnyTenantProductModelCacheJobHandler` | 刷物模型缓存 |
| `flushProductVersionPublishRetryJobHandler` | **版本发布失败的兜底重跑**(整条记录幂等 rerun,见 `../iot/product-version-publish.md`) |
| `syncAnyTenantDeviceConnectionStatusJobHandler` | 同步设备连接状态 |
| `processOtaUpgradeTasksJobHandler` | 推进 OTA 升级任务 |
| `sceneLinkageRuleJobHandler` | 场景联动规则 |
| `flushAnyTenantGroovyScriptCacheJobHandler` | 刷 Groovy 脚本缓存 |
| `sceneExecutionLogCleanupJobHandler` / `bridgeTraceCleanupJobHandler` | 清理执行日志 / 桥接追踪 |
| `zlmMediaServerHeartbeatJobHandler` / `ablMediaServerHeartbeatJobHandler` | 流媒体节点心跳 |
| `executeRecordPlanScheduleJobHandler` / `cleanExpiredRecordFilesJobHandler` | 录像计划 / 清理过期录像 |
| `refreshMediaServerCacheJobHandler` / `refreshSipTenantConfigCacheJobHandler` | 刷流媒体、SIP 租户配置缓存 |
| `deviceKeepaliveTimeoutCheckJobHandler` | GB28181 设备保活超时检查 |
| `ssrcPoolReconcileJobHandler` | SSRC 池对账 |

**`thinglinks-base-executor`** —— 平台侧:`smsSendJobHandler`(短信)、`publishMsgJobHandler`(站内信/通知)。

> **缓存刷新类任务名里的 `AnyTenant` 是字面意思**:它们跨租户遍历,不是当前租户。
> 排查「改了配置没生效」时,先确认对应的 flush 任务在调度中心是启用状态。

## 排查顺序

任务没跑,按这个顺序看,**先看两端有没有连上,再看任务本身**:

1. **执行器有没有注册上调度中心** —— 调度中心「执行器管理」里看 appname 有没有在线机器。
   执行器配的是 `xxl.job.admin.addresses = http://{JOBS_IP}:{JOBS_PORT}/thinglinks-job-admin`,
   **少了 context-path 就注册不上**,且执行器侧日志只表现为注册失败重试
2. **`accessToken` 两端是否一致** —— 调度中心与执行器要么都不设,要么设成相同值;
   不一致的表现是注册被拒,不是任务报错
3. **`EXECUTOR_IP` / `EXECUTOR_PORT`** —— 调度中心是**反向**用 XXL-RPC 调执行器的。
   容器化部署里 `ip` 填错(填成 127.0.0.1)会注册成功但调不动,现象是任务一直「调度失败」
4. 任务本身在调度中心是否启用、cron 是否到点、路由策略与阻塞策略
5. 最后才看业务日志:执行器日志在 `${logging.file.path}/{appname}/jobhandler`,保留 30 天

## 加一个定时任务

1. 在对应执行器模块写 `@XxlJob("xxxJobHandler")` 方法(IoT/视频进 iot-executor,平台侧进 base-executor)
2. 在**调度中心**新建任务,JobHandler 名与注解字符串**一字不差**
3. 跨租户的任务要自己处理租户遍历与上下文 —— 执行器线程上没有请求带来的租户身份
