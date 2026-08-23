---
name: thinglinks-workspace
description: >
  Use when you need to locate the right ThingLinks repository, project directory, or
  file-placement rule across the two product lines: the Community monorepo (thinglinks —
  contains thinglinks-cloud / thinglinks-web / thinglinks-web-visualize / thinglinks-job /
  bifromq-plugin) and the standalone Enterprise repos (thinglinks-cloud-pro-datasource-column,
  thinglinks-web-pro, bifromq-plugin-pro, thinglinks-web-pro-visualize, thinglinks-job-pro,
  thinglinks-util-pro), plus the workspace repos that sit on neither line (mobile, scada, C SDK,
  edge). Covers repo-to-repo mapping, **where the two editions have diverged** (module count,
  service-to-service RPC style, util version, plugin JDK), governance-file placement, the
  `.thinglinks-product.env` product manifest as the single source of version truth and the
  five-component `bump-version.sh` orchestrator, the changelogs/ per-release layout, Nacos config
  template placeholder rules, and which local files must never be committed. Also carries the
  cross-project security baseline (hard requirements checklist).
  Trigger whenever the user mentions 社区版/开源版/旗舰版 repo layout, 版本号/升版本, CHANGELOG,
  产品清单/.thinglinks-product.env, 安全基线/安全红线/安全自检, or asks where a project /
  module / config template lives, or which edition a repo belongs to.
---

# ThingLinks Workspace(双产品线仓库结构)

同一工作区下平级存放。**社区版 = 一个 monorepo;旗舰版 = 按工程拆分的独立仓**,子项目目录树大体同构(模块同名同层级)。
但两条线已经在若干处实质分叉 —— 见 §2,**动手前先确认自己在哪条线上**。

## 1. 仓库映射

**五个组件两条线一一对应**,旗舰版每个组件都是独立仓,不存在"社区特有组件"。

| 工程 | 社区版(monorepo `thinglinks/` 内) | 旗舰版(独立仓) |
| --- | --- | --- |
| IoT 微服务后端 | `thinglinks-cloud/` | `thinglinks-cloud-pro-datasource-column` |
| 管理控制台(Vue3) | `thinglinks-web/` | `thinglinks-web-pro` |
| BifroMQ Broker 插件 | `bifromq-plugin/` | `bifromq-plugin-pro` |
| 可视化大屏 | `thinglinks-web-visualize/` | `thinglinks-web-pro-visualize` |
| 任务调度(XXL-Job 调度中心) | `thinglinks-job/` | `thinglinks-job-pro` |
| 基础框架(Maven 库) | 不含源码,按依赖消费 | `thinglinks-util-pro`(独立发版,`com.mqttsnet.basic`) |

> **任务调度没有独立 skill**:调度中心虽是独立工程,但它是 cloud 的一员,执行器
> (`base-executor` / `iot-executor`)本来就在 cloud 仓里。开发与排查见
> [`thinglinks-cloud` / job-scheduling](../thinglinks-cloud/references/system/job-scheduling.md)。

### 不在双线映射内的仓

同工作区还平级放着这些,**它们不参与五组件版本编排,也没有社区/旗舰对偶**:

| 仓 | 是什么 |
| --- | --- |
| `thinglinks-mobile` | UniApp 移动端 |
| `thinglinks-scada-pro` | SCADA 组态(FUXA 派生,NodeJS + Angular) |
| `thinglinks-web-pro-vben` | Vben 5.x 新控制台原型,与在用的 `thinglinks-web-pro` 并存 |
| `thinglinks_sdk` / `thinglinks-mqtt-c` | 设备侧 C SDK / MQTT C 客户端库 |
| `thinglinks-edge` / `thinglinks-edge-docs` | 多租户 Node-RED 边缘,README 已标 Deprecated |

要改这些仓时**没有对应 skill**,按仓内 README 与代码行事,不要套用 cloud/web 的约定。

## 2. 两条线已经分叉的地方(动手前先确认)

早期两边"同名同构",现在不是了。**判定当前在哪条线:仓库根 `.thinglinks-product.env`
的 `THINGLINKS_EDITION_CODE`(`community` / `enterprise`)。**

| | 社区版 | 旗舰版 |
| --- | --- | --- |
| cloud 一级模块 | 20 个 | **21 个**(多 `thinglinks-ai`) |
| 服务间调用 | `@FeignClient` | **Spring HTTP Interface**(`@HttpExchange` + `@ImportHttpServices` + `@HttpServiceFallback`) |
| util 依赖 | 1.0.8.x | **1.0.9**(Spring Boot 4) |
| BifroMQ 插件 JDK | 17 | **25**(pom enforcer 强制,低于即构建失败) |
| Nacos dataId | 28 | **29**(多 `thinglinks-ai-server.yml`) |

cloud 20 个共有一级模块:public / mqs / rule / broker / link / gateway / oauth / system / base /
tds / video / card / openapi / sdk / generator / view / support / mobile / sop-admin /
dependencies-parent。

> `sop-gateway` **不是一级模块**,它是 `thinglinks-gateway` 下的子模块
> `thinglinks-sop-gateway-server`(Gitee SOP 开放平台网关)。Nacos 里
> `thinglinks-sop-gateway-server.yml` 与 `thinglinks-sop-admin-server.yml` 两个 dataId 都是有效的,
> 对应两个不同的应用。

服务间调用的具体写法差异见 [`thinglinks-cloud` / service-rpc](../thinglinks-cloud/references/system/service-rpc.md) ——
照另一条线写出来的代码编译不过,或编译过了启动时找不到 bean。

## 3. 治理文件存放规则

- **monorepo:LICENSE / LICENSE-COMMERCIAL / CONTRIBUTING / CODE_OF_CONDUCT / SUPPORT / `.github/` / `.editorconfig` / `.gitattributes` 只放仓库根**,子项目目录一律不放(子项目 README 链接用 `../LICENSE` 形式指根)。
- monorepo 的第三方声明集中在根 `licenses/`(`NOTICE` + 各依赖 license 文本),**不在仓库根平铺 `NOTICE`**;旗舰各仓则是根 `NOTICE`。
- 旗舰各仓是独立仓,各自持有整套治理文件。
- 子项目保留自己的多语言 README(`README.md` / `.zh-CN` / `.ja` / `.ko`);社区版措辞用 Community Edition(社区版),旗舰仓用 Enterprise(旗舰版)。

## 4. 版本线与产品清单

**版本号的唯一真相是每个组件根目录的 `.thinglinks-product.env`**,不是 pom 的 `<revision>`、
不是 package.json、更不是检出目录名。那些都是从清单派生出来的产物。

| 线 | 当前形态 | 怎么改 |
| --- | --- | --- |
| 社区 | `1.4.0`,五组件统一 | monorepo 根 `scripts/bump-version.sh <ver>` |
| 旗舰 | 各仓独立(cloud 1.0.9 / bifromq 1.0.9 / util 1.0.9…) | 各仓 `scripts/product-config.sh set-component-version <ver>` |
| util | 独立发版周期 | 各消费方清单里的 `THINGLINKS_UTIL_VERSION`,**不随组件版本走** |

### `bump-version.sh` 是编排器,不是批量替换

社区版根脚本是**五组件版本升级编排器**(cloud / job / bifromq-plugin / web / web-visualize):
读各组件 `.thinglinks-product.env` 的 `THINGLINKS_COMPONENT_VERSION`,再逐个委派给该组件自己的
产品配置工具(后端 `scripts/product-config.sh set-component-version`、前端
`scripts/product-config.mjs set-version`),**任一组件失败就回滚已改的那几个**。
`bump-version.sh check` 只读校验、不写。

旗舰各仓的 `scripts/bump-version.sh`(如 cloud-pro)只是一层薄封装,转调本仓
`product-config.sh set-component-version`。

**不要手改 pom `<revision>` / package.json version**,那会让清单与派生产物对不上,
`product-config.sh check` 与前端 `pnpm product:check` 会拦下来。

### util 版本两条线并不一致

`THINGLINKS_UTIL_VERSION` 是每个消费组件各自声明的,不是全局统一的 ——
社区版 cloud 是 `1.0.8.3` 而 bifromq-plugin 是 `1.0.8.1`,旗舰版都是 `1.0.9`。
回答"用的哪个 util 版本"必须先说清是哪个组件。

## 5. 变更日志规则

- 根 `CHANGELOG.md` 只做**索引**(版本表:Version / Date / Highlights 链接行)。
- 每个版本一个文件:`changelogs/v{X.Y.Z}.md`,Keep a Changelog 风格(`# X.Y.Z (YYYY-MM-DD)` + Added/Changed/Fixed/Removed),英文。
- **子项目不放独立 CHANGELOG**,统一归口仓库根;发新版 = 新增一个 `changelogs/vX.Y.Z.md` + 索引表加一行。

## 6. 配置与凭证规则

- Nacos 配置模板在 cloud 仓的 `docs/config/nacos/DEFAULT_GROUP/`(社区 28 个 dataId,旗舰 29 个,多一个 `thinglinks-ai-server.yml`)。
- 模板内**一律中性占位符**:主机 `127.0.0.1`、口令 `your-mysql-password` / `your-redis-password` / `your-aliyun-access-key-id` / `your-dingtalk-webhook-token` 等;真实 IP、真实口令及其"打乱变体"都不允许入库。
- **永不提交的本地文件**:cloud 的 `src/main/filters/config-dev.properties`(环境凭证)、web 的 `.env.development`(本地地址);web 的 lockfile 按 `.gitignore` 约定(monorepo 忽略 `pnpm-lock.yaml` / `package-lock.json`)。

## 7. 提交风格

`type(scope): 中文描述`(feat/fix/refactor/docs/build/chore/perf),正文可选短列表;目录移动/类改名用 `git mv` 独立成笔,保证 git 历史记录为 rename。

## References Index

| File | Content | When to read |
| --- | --- | --- |
| [references/security-baseline.md](references/security-baseline.md) | 安全硬性指标 7 组红线:凭证密钥 / 多租户隔离 / 鉴权越权 / 注入校验 / 传输存储加密 / 日志泄露 / 运维面加固 | 写码、评审、发版前自检;任何涉及凭证/租户/鉴权/对外端点的改动 |

---

> 📌 **最后核对**:2026-08-22,对照 thinglinks(monorepo,1.4.0)与旗舰各仓当前检出。
> 模块清单、脚本子命令与版本取值以各仓当前代码和 `.thinglinks-product.env` 为准。
