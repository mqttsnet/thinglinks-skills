<div align="center">

# ThingLinks Skills

**Agent Skills for building on the [ThingLinks](https://github.com/mqttsnet/thinglinks) IoT platform.**

Structured, on-demand knowledge packs that turn any AI agent (Claude Code · Codex · Cursor) into a ThingLinks expert.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-4-brightgreen.svg)](#-skills)
[![Powered by skills.sh](https://img.shields.io/badge/powered%20by-skills.sh-7c3aed.svg)](https://skills.sh/)
[![ThingLinks](https://img.shields.io/badge/platform-ThingLinks-0960bd.svg)](https://github.com/mqttsnet/thinglinks)

**English** · [简体中文](./README.zh-CN.md)

</div>

---

## ✨ What are Agent Skills?

Agent Skills are structured knowledge packs that give AI agents **deep, on-demand context** for a specific domain. Each skill is a small `SKILL.md` index + focused `references/*.md` (progressive disclosure) + copy-paste `assets/`. The agent loads only what the current task needs — so context stays lean and answers stay grounded in **real code**, not guesswork.

This repository collects the official skills for the **[ThingLinks](https://github.com/mqttsnet/thinglinks)** IoT platform (Java package `com.mqttsnet.thinglinks`). **Skill names map 1:1 to the platform's repositories**, so you instantly know which codebase a skill covers.

## 📦 Skills

| Skill | Repository | What it helps you do |
| --- | --- | --- |
| [`thinglinks-cloud`](./skills/thinglinks-cloud/) | cloud business platform — `broker` / `mqs` / `rule` / `link` / `public` | Groovy uplink **rule scripts**, **protocol envelope**, custom **TopicHandler**, **downlink commands**, **thing-model**, device/product **cache**, **TDengine + device shadow**, **ACL / topic** matching, **bus extension points**, **troubleshooting**. |
| [`thinglinks-util`](./skills/thinglinks-util/) | framework foundation — `protocol-starter` / `groovy-engine-starter` / `thinglinks-core` | Protocol **codec** (SM4/AES/SHA256 sign), the **Groovy engine** (executor / binding / compile cache), **core utils** (SnowflakeId, LampJackson `Long→String`, MqttTopicMatcher, crypto). |
| [`thinglinks-web`](./skills/thinglinks-web/) | frontend console — Vue3 + Vben | IoT **pages** (device / product / rule / debug / ACL), **API layer** (defHttp), **routing + permission**, Vben + IoT **components**, the rule-script **debug panel**, **conventions** (file placement / Flexy design), **i18n**. |
| [`bifromq-plugin`](./skills/bifromq-plugin/) | BifroMQ broker plugins — `bifromq-plugin-pro` | BifroMQ **auth + ACL** (`IAuthProvider`), **event collector** (`IEventCollector` → Kafka), **setting** & **resource-throttler** providers, the `EventTypeEnum ↔ DeviceActionTypeEnum` mapping, plugin **deployment**. |

## 🚀 Install

Via the [Skills CLI](https://skills.sh/) — install only the skills you need:

```bash
# Global (-g) — available in all projects; drop -g for the current project only
npx skills add mqttsnet/thinglinks-skills@thinglinks-cloud -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-util  -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-web   -g
npx skills add mqttsnet/thinglinks-skills@bifromq-plugin   -g
```

Once installed, a skill **auto-triggers** in your agent when relevant — e.g. when you mention ThingLinks, 规则脚本 (rule scripts), 设备上行/下行 (device uplink/downlink), 物模型 (thing-model), 设备影子 (device shadow), BifroMQ auth/ACL, or the `mqs` / `rule` / `link` / `broker` modules.

## 🧱 How a skill is built

```
<skill>/
├── SKILL.md          # index: architecture overview + References Index + anti-hallucination guardrails
├── references/*.md   # focused subtopic docs, loaded on demand (progressive disclosure)
├── assets/           # copy-paste starters (where useful)
└── agents/openai.yaml# cross-tool interface (Codex / OpenAI agents)
```

- `thinglinks-cloud` — 12 references + 3 Groovy rule-script skeletons
- `thinglinks-util` — 3 references (`protocol-codec` / `groovy-engine` / `core-utils`)
- `thinglinks-web` — 7 references (structure / api / routing-permission / **conventions** / ui-components / iot-pages / rule-script-debug)
- `bifromq-plugin` — 4 references (`auth-acl` / `event-collector` / `setting-throttler` / `deploy-config`)

## 🏷️ Naming convention

Repo = namespace; **skill names map 1:1 to the platform's repositories** (no `-dev` suffix):

| Skill | Repository |
| --- | --- |
| `thinglinks-cloud` | cloud business platform — `broker` / `mqs` / `rule` / `link` / `public` |
| `thinglinks-util` | framework foundation — `protocol-starter` / `groovy-engine-starter` / `thinglinks-core` |
| `thinglinks-web` | frontend console — Vue3 |
| `bifromq-plugin` | BifroMQ broker plugins — `bifromq-plugin-pro` |

## 🔗 Related projects

- **[ThingLinks](https://github.com/mqttsnet/thinglinks)** — the enterprise-grade IoT platform these skills document.
- More from [**@mqttsnet**](https://github.com/mqttsnet) — the org behind ThingLinks.

## 🤝 Contributing

PRs welcome! Please:

- Keep each `references/*.md` focused on **one** subtopic — don't bloat `SKILL.md`; add a reference and link it from the index.
- Base content on **real code**. For volatile field names / signatures, note _"verify against `com.mqttsnet.thinglinks.*`"_ rather than hardcoding.
- Keep the `description:` in each `SKILL.md` frontmatter rich and scenario-specific — it is the trigger.
- One skill = one repository (follow the naming convention above).

## 📄 License

[Apache-2.0](./LICENSE) © [mqttsnet](https://github.com/mqttsnet)
