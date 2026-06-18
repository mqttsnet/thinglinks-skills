# 构建 / 运行 / 跨仓库

## 三个仓库(对应三个 skill)

| 仓库 | 内容 | skill |
| --- | --- | --- |
| `thinglinks-cloud-pro-*`(主) | broker / mqs / rule / link / public 业务模块 | `thinglinks-cloud`(本) |
| `thinglinks-util-pro`(框架) | `protocol-starter` / `groovy-engine-starter` / `thinglinks-core` | `thinglinks-util` |
| `thinglinks-web-pro` | Vue3 前端控制台 | `thinglinks-web` |

## 本地启动

各模块 Spring Boot 主类继承 `common` 的 `ServerApplication`;服务注册/配置走 **Nacos**。

| 模块 | 主类 | 端口 | 服务名 |
| --- | --- | --- | --- |
| broker | `BrokerServerApplication` | 18790 | thinglinks-broker |
| mqs | `MqsServerApplication` | 18784 | thinglinks-mqs |
| rule | `RuleServerApplication` | 18786 | thinglinks-rule |
| link | `LinkServerApplication` | 18782 | thinglinks-link |
| gateway | `GatewayServerApplication` | 18760 | thinglinks-gateway |

**依赖中间件**:Nacos(18848,配置/注册)、Kafka(上行事件流)、RocketMQ(桥接/告警/下行)、Redis(缓存/会话/指标)、TDengine(时序)、BifroMQ(MQTT broker,feign `…:8091`)、MySQL(元数据)。Nacos 上 `kafka.yml`/`rocketmq.yml`/`redis.yml`/`database.yml`。

**起法**:`cd docker && docker-compose up -d` 一键拉全栈(`docker/docker-compose.yml`);或 IDE 跑各模块主类 + 指向本地 Nacos。`SPRING_PROFILES_ACTIVE=test`。

## 编译

- 后端 `mvn clean package -P test -DskipTests`(或 `-P prod`);整库校验用 IDEA MCP `build_project`;
- **改了 util-pro 必须先 `mvn install` 到本地仓**,主库才拉得到新版本(否则用旧 jar);
- 前端 `npx eslint --fix` + `npx eslint`。

## 跨仓库联动(改一处要同步)

- `DeviceActionTypeEnum` 改 → bifromq-plugin-pro `EventTypeEnum` + DBA 字典 SQL + rule 规则 JSON + mqs README 第 7 节;
- Kafka topic / `BridgeMessageEnvelope` 改 → 见 `references/extension-points.md`;
- util-pro 的 `LampJacksonModule` / `SnowflakeIdUtil` / `MqttTopicMatcher` 是全局行为,改动影响所有下游(谨慎,细节见 `thinglinks-util` skill)。

## XXL-Job 调度任务(`thinglinks-iot-executor` 的 `LinkJob`)

XXL-Job 执行器在 `thinglinks-support`。链路相关 handler:`flushAnyTenantDeviceCacheJobHandler` / `flushAnyTenantProductCacheJobHandler` / `flushAnyTenantProductModelCacheJobHandler`(**缓存刷新仅做预热**)、`syncAnyTenantDeviceConnectionStatusJobHandler`、`processOtaUpgradeTasksJobHandler`。

> **发布重试已拆为独立调度任务**:`@XxlJob("flushProductVersionPublishRetryJobHandler")` 调 facade `LinkJobHandlerFacade.retryProductVersionPublish(tenantId)`,与缓存预热解耦(故障互不影响、周期可单独加密,建议 2~5 分钟覆盖 1h 兜底窗口)。整条记录幂等 rerun 机制见 `iot/product-version-publish.md`。

## 提交规范(本仓约定)

- **不自动 commit**(改完先展示,等用户分批指令;"继续/完成"≠ commit 授权);
- commit 信息 `type(scope): 描述` + 正文,**不加** `Co-Authored-By`;
- 代码里**不写任务规划标记**(v7 / P1 / P2.x / `@since vX PY` 等);
- README/注释**不用 `§` 章节符号**(用 `1.`/`第 N 节`;引用外部标准 `RFC xxxx §Y` 例外);
- 移动目录用 `git mv`。
