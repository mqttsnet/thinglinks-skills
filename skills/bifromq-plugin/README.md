# bifromq-plugin

ThingLinks BifroMQ 3.3.5 broker plugin skill，覆盖认证与 ACL、事件到
Kafka、setting/resource provider、运行时配置与日志安全、构建和发行边界。

## 结构

```text
bifromq-plugin/
├── SKILL.md
├── references/
│   ├── auth-acl.md
│   ├── event-collector.md
│   ├── setting-throttler.md
│   ├── deploy-config.md
│   ├── runtime-safety.md
│   └── build-release.md
├── assets/standalone-register.yml
└── agents/openai.yaml
```

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@bifromq-plugin -g
```

内容以 `bifromq-plugin-pro` 当前代码为准。不得把未实现的资源限流、缓存刷新、
日志隔离或消息可靠性写成现有能力。
