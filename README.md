<div align="center">

# ThingLinks Skills

**Agent Skills for building on the [ThingLinks](https://github.com/mqttsnet/thinglinks) IoT platform.**

Structured, on-demand knowledge packs that turn any AI agent (Claude Code · Codex · Cursor) into a ThingLinks expert.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-4-brightgreen.svg)](#-skills)
[![Powered by skills.sh](https://img.shields.io/badge/powered%20by-skills.sh-7c3aed.svg)](https://skills.sh/)
[![ThingLinks](https://img.shields.io/badge/platform-ThingLinks-0960bd.svg)](https://github.com/mqttsnet/thinglinks)

**English** · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md)

</div>

---

## ✨ What are Agent Skills?

Agent Skills are structured knowledge packs that give AI agents **deep, on-demand context** for a specific domain. Each skill is a small `SKILL.md` index + focused `references/*.md` (progressive disclosure) + copy-paste `assets/`. The agent loads only what the current task needs — so context stays lean and answers stay grounded in **real code**, not guesswork.

This repository collects the official skills for the **[ThingLinks](https://github.com/mqttsnet/thinglinks)** IoT platform (Java package `com.mqttsnet.thinglinks`). **Skill names map 1:1 to the platform's repositories**, so you instantly know which codebase a skill covers.

## 📦 Skills

| Skill | Repository | What it helps you do |
| --- | --- | --- |
| [`thinglinks-cloud`](./skills/thinglinks-cloud/) | cloud platform — **system** / **IoT** / **video** | **3 domains.** *IoT:* rule scripts, protocol envelope, TopicHandler, downlink (`DeviceDownlinkFacade`), thing-model, cache, TDengine + shadow, ACL, WS broadcast, bus extension points. *System:* WebFlux gateway (Sa-Token), oauth, system/base, boot/cloud Facade duality, DATASOURCE_COLUMN multi-tenant. *Video:* GB28181 streaming (ZLMediaKit). |
| [`thinglinks-util`](./skills/thinglinks-util/) | framework foundation — protocol / script / cache / messaging / core | Protocol **codec**, Groovy execution and safety boundaries, typed **cache-aside and locks**, Kafka/RocketMQ, databridge SPI, sensitive-field encryption, IDs/Jackson/topic/HLC utilities, and build/release rules. |
| [`thinglinks-web`](./skills/thinglinks-web/) | frontend console — Vue3 + Vben | IoT **pages** (device / product / rule / debug / ACL), **API layer** (defHttp), **routing + permission**, Vben + IoT **components**, the rule-script **debug panel**, **conventions** (file placement / Flexy design), **i18n**. |
| [`bifromq-plugin`](./skills/bifromq-plugin/) | BifroMQ broker plugins — `bifromq-plugin-pro` | BifroMQ **auth + ACL** (`IAuthProvider`), **event collector** (`IEventCollector` → Kafka), **setting** & **resource-throttler** providers, the `EventTypeEnum ↔ DeviceActionTypeEnum` mapping, plugin **deployment**. |
| [`thinglinks-workspace`](./skills/thinglinks-workspace/) | workspace layout — Community monorepo ↔ Enterprise repos | **Repo & path locator.** Repo-to-repo mapping (cloud / web / bifromq-plugin / util), governance-file placement, independent **version lines** + `bump-version.sh`, `changelogs/` per-release layout, Nacos template **placeholder rules**, never-commit local files, commit style, **security baseline** (hard-requirements checklist). |

## 🚀 Install

Via the [Skills CLI](https://skills.sh/) — install only the skills you need:

```bash
# Global (-g) — available in all projects; drop -g for the current project only
npx skills add mqttsnet/thinglinks-skills@thinglinks-cloud -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-util  -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-web   -g
npx skills add mqttsnet/thinglinks-skills@bifromq-plugin   -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-workspace -g
```

Once installed, a skill **auto-triggers** in your agent when relevant — e.g. when you mention ThingLinks, rule scripts, device uplink/downlink, thing models, device shadow, gateway/auth/multi-tenant, cache/locks, sensitive-field encryption, Kafka/RocketMQ, GB28181 video, BifroMQ auth/ACL, or the corresponding modules.

## 🧱 How a skill is built

```
<skill>/
├── SKILL.md          # index: architecture overview + References Index + anti-hallucination guardrails
├── references/*.md   # focused subtopic docs, loaded on demand (progressive disclosure)
├── assets/           # copy-paste starters (where useful)
└── agents/openai.yaml# cross-tool interface (Codex / OpenAI agents)
```

- `thinglinks-cloud` — 20 references across **`system/` · `iot/` · `video/`** (incl. `iot/device-access` + `iot/testing` for simulation/testing) + 3 Groovy skeletons + Mermaid diagrams
- `thinglinks-util` — 9 references (protocol / Groovy / cache / encryption / core / Kafka / RocketMQ / databridge / build-release)
- `thinglinks-web` — 7 references (structure / api / routing-permission / **conventions** / ui-components / iot-pages / rule-script-debug)
- `bifromq-plugin` — 4 references (`auth-acl` / `event-collector` / `setting-throttler` / `deploy-config`)
- `thinglinks-workspace` — 1 reference (`security-baseline` hard-requirements checklist)

## 🏷️ Naming convention

Repo = namespace; **skill names map 1:1 to the platform's repositories** (no `-dev` suffix):

| Skill | Repository |
| --- | --- |
| `thinglinks-cloud` | cloud business platform — `broker` / `mqs` / `rule` / `link` / `public` |
| `thinglinks-util` | framework foundation — protocol / script / cache / messaging / core |
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
