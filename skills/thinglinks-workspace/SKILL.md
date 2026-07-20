---
name: thinglinks-workspace
description: >
  Use when you need to locate the right ThingLinks repository, project directory, or
  file-placement rule across the two product lines: the Community monorepo (thinglinks —
  contains thinglinks-cloud / thinglinks-web / thinglinks-web-visualize / thinglinks-job /
  bifromq-plugin) and the standalone Enterprise repos (thinglinks-cloud-pro-datasource-column,
  thinglinks-web-pro, bifromq-plugin-pro, thinglinks-util-pro). Covers repo-to-repo mapping,
  governance-file placement, version lines and bump script, the changelogs/ per-release layout,
  Nacos config template placeholder rules, and which local files must never be committed.
  Also carries the cross-project security baseline (hard requirements checklist).
  Trigger whenever the user mentions 社区版/开源版/旗舰版 repo layout, 版本号, CHANGELOG,
  安全基线/安全红线/安全自检, or asks where a project / module / config template lives.
---

# ThingLinks Workspace(双产品线仓库结构)

同一工作区下平级存放。**社区版 = 一个 monorepo;旗舰版 = 按工程拆分的独立仓**,子项目目录树同构(模块同名同层级)。

## 1. 仓库映射

| 工程 | 社区版(monorepo `thinglinks/` 内) | 旗舰版(独立仓) |
| --- | --- | --- |
| IoT 微服务后端 | `thinglinks-cloud/` | `thinglinks-cloud-pro-datasource-column` |
| 管理控制台(Vue3) | `thinglinks-web/` | `thinglinks-web-pro` |
| BifroMQ Broker 插件 | `bifromq-plugin/` | `bifromq-plugin-pro` |
| 可视化大屏 | `thinglinks-web-visualize/` | —(社区特有目录) |
| 任务调度 | `thinglinks-job/` | —(社区特有目录) |
| 基础框架(Maven 库) | 不含源码,按依赖消费 | `thinglinks-util-pro`(独立发版到 Maven Central,`com.mqttsnet.basic`) |

cloud 共 20 个一级模块(public/mqs/rule/broker/link/gateway/oauth/system/base/tds/video/card/openapi/sdk/generator/view/support/mobile/sop-admin/dependencies-parent),两边同名同构。

## 2. 治理文件存放规则

- **monorepo:LICENSE / LICENSE-COMMERCIAL / CONTRIBUTING / CODE_OF_CONDUCT / SUPPORT / NOTICE / `.github/` / `.editorconfig` / `.gitattributes` 只放仓库根**,子项目目录一律不放(子项目 README 链接用 `../LICENSE` 形式指根)。
- 旗舰各仓是独立仓,各自持有整套治理文件。
- 子项目保留自己的多语言 README(`README.md` / `.zh-CN` / `.ja` / `.ko`);社区版措辞用 Community Edition(社区版),旗舰仓用 Enterprise(旗舰版)。

## 3. 版本线(相互独立)

| 线 | 当前形态 | 定义位置 |
| --- | --- | --- |
| 社区 | `1.x.y`(如 1.4.0),**全 monorepo 统一** | 8 个 pom `<revision>` + 2 个 package.json,由 `scripts/bump-version.sh <ver>` 一键改(共 10 处) |
| 旗舰 | `1.0.x`(各仓独立小版本) | 各仓自己的 `<revision>` / version 字段 |
| util | 独立发版周期 | 两线都通过 `thinglinks-util.version` 属性锚定,不随上面两线 bump |

## 4. 变更日志规则

- 根 `CHANGELOG.md` 只做**索引**(版本表:Version / Date / Highlights 链接行)。
- 每个版本一个文件:`changelogs/v{X.Y.Z}.md`,Keep a Changelog 风格(`# X.Y.Z (YYYY-MM-DD)` + Added/Changed/Fixed/Removed),英文。
- **子项目不放独立 CHANGELOG**,统一归口仓库根;发新版 = 新增一个 `changelogs/vX.Y.Z.md` + 索引表加一行。

## 5. 配置与凭证规则

- Nacos 配置模板在 `docs/config/nacos/DEFAULT_GROUP/`(28 个 dataId,两边同名同构)。
- 模板内**一律中性占位符**:主机 `127.0.0.1`、口令 `your-mysql-password` / `your-redis-password` / `your-aliyun-access-key-id` / `your-dingtalk-webhook-token` 等;真实 IP、真实口令及其"打乱变体"都不允许入库。
- **永不提交的本地文件**:cloud 的 `src/main/filters/config-dev.properties`(环境凭证)、web 的 `.env.development`(本地地址);web 的 lockfile 按 `.gitignore` 约定(monorepo 忽略 `pnpm-lock.yaml` / `package-lock.json`)。

## 6. 提交风格

`type(scope): 中文描述`(feat/fix/refactor/docs/build/chore/perf),正文可选短列表;目录移动/类改名用 `git mv` 独立成笔,保证 git 历史记录为 rename。

## References Index

| File | Content | When to read |
| --- | --- | --- |
| [references/security-baseline.md](references/security-baseline.md) | 安全硬性指标 7 组红线:凭证密钥 / 多租户隔离 / 鉴权越权 / 注入校验 / 传输存储加密 / 日志泄露 / 运维面加固 | 写码、评审、发版前自检;任何涉及凭证/租户/鉴权/对外端点的改动 |

---

> 📌 **最后核对**:thinglinks(monorepo)· 2026-06-11。模块清单与脚本覆盖位置以各仓当前代码为准。
