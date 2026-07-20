# thinglinks-util

ThingLinks **框架底座**开发辅助 Agent Skill，覆盖协议编解码、Groovy 脚本引擎、缓存与锁、Kafka/RocketMQ、桥接 SPI、敏感字段加密、core 工具和构建发行边界。

> 同家族:`thinglinks-cloud`(云端业务)、`thinglinks-web`(前端)。

## 结构

```
thinglinks-util/
├── SKILL.md
├── references/
│   ├── protocol-codec.md   # protocol-starter:信封编解码/加解密/签名
│   ├── groovy-engine.md    # groovy-engine-starter:执行器/绑定/编译缓存
│   ├── cache-starter.md    # cache-starter:后端差异/List/锁
│   ├── sensitive-field-encryption.md # ENC@/AES/MyBatis TypeHandler
│   ├── core-utils.md       # thinglinks-core:ID/Jackson/topic/HLC
│   ├── kafka-starter.md    # Kafka 生产消费边界
│   ├── rocketmq-starter.md # RocketMQ 上下文透传
│   ├── databridge-starter.md # 桥接 SPI
│   └── build-release.md    # 版本、构建和发布边界
└── agents/openai.yaml
```

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@thinglinks-util -g
```

## 维护约定

- 改动是**全局行为**,影响所有依赖模块;改完 `mvn install` 到本地仓下游才会消费新工件。
- 内容以真实代码为准,核对 `com.mqttsnet.basic.*`。
