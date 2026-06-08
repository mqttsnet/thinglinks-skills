# thinglinks-util

ThingLinks **框架底座**开发辅助 Agent Skill —— 帮 AI Agent 在 `thinglinks-util-pro`(`com.mqttsnet.basic`)上开发:协议编解码(SM4/AES/签名)、Groovy 脚本引擎、core 工具类。

> 同家族:`thinglinks-cloud`(云端业务)、`thinglinks-web`(前端)。

## 结构

```
thinglinks-util/
├── SKILL.md
├── references/
│   ├── protocol-codec.md   # protocol-starter:信封编解码/加解密/签名
│   ├── groovy-engine.md    # groovy-engine-starter:执行器/绑定/编译缓存
│   └── core-utils.md       # thinglinks-core:SnowflakeId/LampJackson/MqttTopicMatcher/crypto
└── agents/openai.yaml
```

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@thinglinks-util -g
```

## 维护约定

- 改动是**全局行为**,影响所有依赖模块;改完 `mvn install` 到本地仓主库才生效。
- 内容以真实代码为准,核对 `com.mqttsnet.basic.*`。
