# bifromq-plugin

ThingLinks **BifroMQ broker 插件**开发辅助 Agent Skill —— 帮 AI Agent 在 `bifromq-plugin-pro`(`com.mqttsnet.thinglinks`,BifroMQ 3.3.5 SPI)上开发:认证 + ACL、事件采集(Kafka)、配置提供、资源限流。

> 同家族:`thinglinks-cloud` / `thinglinks-util` / `thinglinks-web`。它是 broker 侧"门卫 + 事件出口",上游喂 `thinglinks-cloud` 的 mqs。

## 结构

```
bifromq-plugin/
├── SKILL.md
├── references/
│   ├── auth-acl.md          # IAuthProvider:认证 + 发布/订阅 ACL(快/慢路径 + 缓存)
│   ├── event-collector.md   # IEventCollector:EventTypeEnum → Kafka topic
│   ├── setting-throttler.md # ISettingProvider + IResourceThrottler
│   └── deploy-config.md     # 构建 / config.yaml / 装进 BifroMQ
└── agents/openai.yaml
```

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@bifromq-plugin -g
```

## 维护约定

- BifroMQ **3.3.5**(`com.baidu.bifromq.*`);别按 4.0 写。
- 同步路径(setting/throttler/ACL 快路径)**禁阻塞/远程调用**。
- 内容以真实代码为准,核对 `com.mqttsnet.thinglinks.*`。
