# 产品配置与运行命名空间

## 四类配置不要混用

| 配置 | 权威入口 | 作用 |
| --- | --- | --- |
| 产品身份、版本、发行与授权 | 根目录 `.thinglinks-product.env` | 构建和发布元数据；Cloud/Util 版本键分别为 `THINGLINKS_COMPONENT_VERSION` / `THINGLINKS_UTIL_VERSION` |
| MQ 命名空间 | 清单中的 `THINGLINKS_MQ_NAMESPACE` | 生成业务 Topic 与 Kafka/RocketMQ Consumer Group 前缀 |
| Nacos 命名空间 | 部署变量 `NACOS_NAMESPACE` | 服务注册与配置隔离 |
| Seata 命名空间 | 部署变量 `SEATA_NAMESPACE` | Seata 注册与配置隔离 |

MQ 命名空间会进入编译产物；Nacos/Seata 命名空间属于运行环境。三者可以取相同值，但没有自动联动关系，排障时不要互相替代。

## 产品清单是唯一写入口

`.thinglinks-product.env` 纳入 Git，只存可公开的产品元数据，**不要写密码、令牌、客户端密钥或环境地址**。产品/组件稳定编码不带发行版本词；发行差异只放在 `THINGLINKS_EDITION_*`、授权字段和同步保护路径中。不要从仓库目录名、README 标题或 Maven 坐标推断产品身份。

`scripts/product-config.sh render` 受管以下目标：

- 根 `pom.xml`：组件 `artifactId` 和名称；
- `thinglinks-dependencies-parent/pom.xml`：Cloud 版本与 Util 依赖版本；
- `thinglinks-sdk/pom.xml`：Cloud 版本；
- `thinglinks-public/thinglinks-common/src/main/java/com/mqttsnet/thinglinks/common/mq/ConsumerGroupConstant.java`：MQ 小写/大写命名空间及 Consumer Group 前缀。

修改清单后执行 `render`，**不要分别手改这些派生值**。`BizMqRouteConstant` 通过 `ConsumerGroupConstant` 组合业务路由，不是另一份配置入口。

## 命令与验证顺序

```bash
# 只读一致性检查
./scripts/product-config.sh check

# 查询或更新版本；更新命令会自动 render + check
./scripts/product-config.sh get-component-version
./scripts/product-config.sh set-component-version <cloud-version>
./scripts/product-config.sh set-util-version <util-version>

# 手工修改清单的其他字段后渲染
./scripts/product-config.sh render
```

- `check` 校验清单格式、版本/授权组合、POM 与常量同步、Kafka Consumer Group 绑定和发行边界；源码归档没有 `.git` 时也能运行。
- `render` 和两个版本更新命令使用 Git ref 写锁、原子替换和失败回滚，只能在 Git 工作区执行；不要并发运行，也不要删除活动进程持有的锁。
- 完整回归顺序：`scripts/tests/product-config-test.sh` → `scripts/product-config.sh check` → Maven 构建 → `git diff --check`。
- 同时升级 Util 时，先在 `thinglinks-util` 仓完成安装/发布，再更新 `THINGLINKS_UTIL_VERSION` 并构建 Cloud。

## MQ 路由派生

设清单值为 `<mq-namespace>`，大写派生会把 `-` 转成 `_`：

| 对象 | 规则 | 示例后缀 |
| --- | --- | --- |
| RocketMQ 业务 Topic | `<mq-namespace>-<domain>-<purpose>` | `ws-command-downlink`、`bridge-device-event` |
| Kafka/RocketMQ Consumer Group | `CID_<MQ_NAMESPACE_UPPER>_<DOMAIN>_<PURPOSE>` | `BUS_MQTT`、`BRIDGE_INGRESS` |
| BROADCASTING Consumer Group | 上述前缀再拼 listener 约定的运行时后缀 | 当前 WS 心跳/下行均拼 `${spring.application.name}` |

`THINGLINKS_MQ_NAMESPACE` 当前控制 `BizMqRouteConstant` 的 RocketMQ 业务 Topic，以及 Kafka/RocketMQ Consumer Group 前缀；`KafkaConsumerTopicConstant` 中由 broker/plugin 提供的 `mqtt.*`、`websocket.*`、`tcp.*` Topic **不会随它改名**。

更换 MQ 命名空间是运行标识迁移，不是普通展示名修改：所有生产者、消费者、外部集成和预创建的 Topic/Group 必须一起切换。先清点旧资源与消费位点，不要为“修复收不到消息”直接删除 Group 或重置 offset。

## 跨发行同步边界

- 以目标仓清单中的 `THINGLINKS_SYNC_PROTECTED_PATHS` 为准，至少保护目标清单、基础授权文件和该发行附加授权文件；同步时不要用源仓对应文件覆盖它们。
- 代码同步后，在**目标仓**先执行 `render`，再按“配置回归 → `check` → Maven 构建 → `git diff --check`”完成验证。
- `check` 会扫描非保护路径的文件名与内容，阻止发行版本标识散落到共享源码；该扫描在 Git 工作区和无 `.git` 的源码归档中都生效。

## 部署与排障

`src/main/filters/config-*.properties` 不保存 Nacos/Seata 命名空间默认 UUID；服务启动时环境变量优先于构建期占位值。Docker Compose 要求显式提供 `NACOS_NAMESPACE`、`SEATA_NAMESPACE`、Nacos 凭据和 Actuator 凭据，先运行 `docker compose -f docker/docker-compose.yml config` 做变量展开检查。

1. 先执行产品配置 `check`，确认编译产物里的 MQ 前缀与清单一致。
2. 核对进程实际收到的 `NACOS_NAMESPACE` / `SEATA_NAMESPACE`，以及 Nacos 地址和凭据；确认服务注册与配置拉取落在同一 Nacos 命名空间。
3. 按派生规则核对 RocketMQ Topic、Kafka/RocketMQ Group 和外部生产者/消费者配置；不要拿 Nacos 命名空间拼 MQ 路由。
4. WS 心跳/下行 listener 当前都在 Group 前缀后拼 `${spring.application.name}` 并使用 `BROADCASTING`；核对进程实际应用名。Kafka 上行则保留既有 `mqtt.*` 等 Topic，只检查 Consumer Group 前缀。
