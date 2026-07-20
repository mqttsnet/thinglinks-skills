<div align="center">

# ThingLinks Skills

**面向 [ThingLinks](https://github.com/mqttsnet/thinglinks) 物联网平台的 Agent Skills 合集。**

结构化、按需加载的知识包,让任意 AI Agent(Claude Code · Codex · Cursor)秒变 ThingLinks 专家。

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-4-brightgreen.svg)](#-技能列表)
[![Powered by skills.sh](https://img.shields.io/badge/powered%20by-skills.sh-7c3aed.svg)](https://skills.sh/)
[![ThingLinks](https://img.shields.io/badge/platform-ThingLinks-0960bd.svg)](https://github.com/mqttsnet/thinglinks)

[English](./README.md) · **简体中文** · [日本語](./README.ja.md) · [한국어](./README.ko.md)

</div>

---

## ✨ 什么是 Agent Skills?

Agent Skills 是结构化的知识包,为 AI Agent 提供某领域**按需加载**的深度上下文。每个 skill = 精简的 `SKILL.md` 索引 + 聚焦的 `references/*.md`(渐进式披露)+ 可直接复制的 `assets/`。Agent 只拉取当前任务需要的部分 —— 上下文精简,答案**扎根真实代码**而非臆测。

本仓库收录 **[ThingLinks](https://github.com/mqttsnet/thinglinks)** 物联网平台(Java 包名 `com.mqttsnet.thinglinks`)的官方 skills。**skill 名与平台代码仓库 1:1 对应**,一看就知道哪个 skill 管哪个仓。

## 📦 技能列表

| Skill | 对应仓库 | 帮你做什么 |
| --- | --- | --- |
| [`thinglinks-cloud`](./skills/thinglinks-cloud/) | 云平台 —— **系统基础** / **IoT** / **流媒体** | **三域。** *IoT:* 规则脚本、协议信封、TopicHandler、下行(`DeviceDownlinkFacade`)、物模型、缓存、TDengine+影子、ACL、WS 广播、bus 扩展点。*系统基础:* WebFlux 网关(Sa-Token)、oauth、system/base、boot/cloud Facade 双实现、DATASOURCE_COLUMN 多租户。*流媒体:* GB28181(ZLMediaKit)。 |
| [`thinglinks-util`](./skills/thinglinks-util/) | 框架底座 —— 协议 / 脚本 / 缓存 / 消息 / core | 协议**编解码**、Groovy 执行与安全边界、typed **cache-aside 与锁**、Kafka/RocketMQ、桥接 SPI、敏感字段加密、ID/Jackson/topic/HLC 工具和构建发行规则。 |
| [`thinglinks-web`](./skills/thinglinks-web/) | 前端控制台 —— Vue3 + Vben | IoT **页面**(设备/产品/规则/调试/ACL)、**API 层**(defHttp)、**路由 + 权限**、Vben + IoT **组件**、规则脚本**调试面板**、**开发准则**(按域放文件 / Flexy 风格)、**i18n**。 |
| [`bifromq-plugin`](./skills/bifromq-plugin/) | BifroMQ broker 插件 —— `bifromq-plugin-pro` | BifroMQ **认证 + ACL**(`IAuthProvider`)、**事件采集**(`IEventCollector` → Kafka)、**配置/限流** provider、`EventTypeEnum ↔ DeviceActionTypeEnum` 映射、插件**部署**。 |
| [`thinglinks-workspace`](./skills/thinglinks-workspace/) | 工作区结构 —— 社区 monorepo ↔ 旗舰独立仓 | **仓库与路径定位。** 工程映射(cloud / web / bifromq-plugin / util)、治理文件归口、独立**版本线** + `bump-version.sh`、`changelogs/` 每版一文件、Nacos 模板**占位符规则**、永不提交清单、提交风格、**安全基线**(硬性指标检查表)。 |

## 🚀 安装

通过 [Skills CLI](https://skills.sh/),按需安装:

```bash
# 全局(-g)所有项目可用;去掉 -g 仅当前项目
npx skills add mqttsnet/thinglinks-skills@thinglinks-cloud -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-util  -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-web   -g
npx skills add mqttsnet/thinglinks-skills@bifromq-plugin   -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-workspace -g
```

装完后,Agent 会在相关场景**自动触发** —— 比如你提到 ThingLinks、规则脚本、设备上行/下行、物模型、设备影子、网关/鉴权/多租户、缓存与锁、敏感字段加密、Kafka/RocketMQ、流媒体/GB28181 或 BifroMQ 认证/ACL 时。

## 🧱 skill 怎么搭

```
<skill>/
├── SKILL.md          # 索引:架构总览 + References Index + 反幻觉护栏
├── references/*.md   # 聚焦子主题文档,按需加载(渐进式披露)
├── assets/           # 可抄起始骨架(需要时)
└── agents/openai.yaml# 跨工具接口(Codex / OpenAI)
```

- `thinglinks-cloud` —— 20 篇 references(**`system/` · `iot/` · `video/`**,含 `iot/device-access` + `iot/testing` 供模拟/测试)+ 3 个 Groovy 骨架 + Mermaid 架构图
- `thinglinks-util` —— 9 篇 references(协议 / Groovy / 缓存 / 加密 / core / Kafka / RocketMQ / 桥接 / 构建发行)
- `thinglinks-web` —— 7 篇 references(结构 / api / 路由权限 / **开发准则** / 组件 / 页面地图 / 脚本调试)
- `bifromq-plugin` —— 4 篇 references(`auth-acl` / `event-collector` / `setting-throttler` / `deploy-config`)
- `thinglinks-workspace` —— 1 篇 reference(`security-baseline` 安全硬性指标)

## 🏷️ 命名规范

仓库 = 命名空间;**skill 名与平台代码仓库 1:1 对应**(不加 `-dev` 后缀):

| Skill | 对应仓库 |
| --- | --- |
| `thinglinks-cloud` | 云端业务平台 —— `broker` / `mqs` / `rule` / `link` / `public` |
| `thinglinks-util` | 框架底座 —— 协议 / 脚本 / 缓存 / 消息 / core |
| `thinglinks-web` | 前端控制台 —— Vue3 |
| `bifromq-plugin` | BifroMQ broker 插件 —— `bifromq-plugin-pro` |

## 🔗 相关项目

- **[ThingLinks](https://github.com/mqttsnet/thinglinks)** —— 这些 skill 所文档化的企业级物联网平台。
- 更多见 [**@mqttsnet**](https://github.com/mqttsnet) —— ThingLinks 背后的组织。

## 🤝 贡献

欢迎 PR:

- 每篇 `references/*.md` 聚焦**一个**子主题 —— 别堆进 `SKILL.md`,新增 reference 并在索引里链上。
- 内容**以真实代码为准**;易变字段名/签名注明 _"核对 `com.mqttsnet.thinglinks.*`"_,不要硬编码。
- 每个 `SKILL.md` 的 `description` 写得**具体、场景化** —— 它是触发器。
- 一个 skill 对应一个仓库(遵循上面的命名规范)。

## 📄 许可

[Apache-2.0](./LICENSE) © [mqttsnet](https://github.com/mqttsnet)
