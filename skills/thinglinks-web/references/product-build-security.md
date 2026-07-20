# 产品配置、构建门禁与浏览器配置安全

## 配置边界

| 配置 | 权威入口 | 是否进入浏览器 |
| --- | --- | --- |
| 产品身份、Web 版本、发行与授权 | 根目录 `.thinglinks-product.env` | 公开子集会进入构建产物 |
| OAuth 公共客户端标识 | `THINGLINKS_WEB_CLIENT_ID` | 会，映射为 `VITE_GLOB_CLIENT_ID` |
| 前端 MQ 命名空间 | `THINGLINKS_MQ_NAMESPACE` | 会，通过 `__THINGLINKS_PRODUCT_INFO__` 暴露 |
| 环境地址、开关、公开浏览器参数 | `.env` / `.env.<mode>` 或部署环境 | `VITE_*` 都会进入客户端 |
| 私钥、服务端令牌、真正的客户端密钥 | 服务端配置或密钥管理系统 | **绝不能进入前端源码或 `VITE_*`** |

`.thinglinks-product.env` 纳入 Git，只保存允许公开的产品元数据。解析器使用固定键白名单；不要新增 `SECRET_TOKEN` 一类自定义键，也不要在页面、语言包或构建代码中复制发行名称。

## 清单与受管字段

关键字段：

- `THINGLINKS_COMPONENT_VERSION` / `THINGLINKS_NPM_PACKAGE_NAME`：Web 版本和 NPM 包名；
- `THINGLINKS_EDITION_*` / `THINGLINKS_LICENSE_*`：发行展示与授权；
- `THINGLINKS_WEB_CLIENT_ID`：与 Cloud `def_client` 记录一致的浏览器公共客户端 ID；
- `THINGLINKS_MQ_NAMESPACE`：消息总线统计页测试 Topic 的默认前缀；
- `THINGLINKS_SYNC_PROTECTED_PATHS`：跨发行同步时由目标仓保留的路径。

`pnpm product:render` 只派生 `package.json` 的 `name`、`version`、`license`。Vite 构建通过 `build/productConfig.ts` 读取同一清单，生成 `__THINGLINKS_PRODUCT_INFO__` 和 `VITE_GLOB_CLIENT_ID`；不要手改这些派生值来绕过清单。

```bash
pnpm product:check
pnpm product:render
pnpm product:set-version <version>
pnpm product:test
```

- `product:set-version` 原子更新清单与 `package.json`，并完成一致性校验。
- `product:render` / `product:set-version` 使用 Git ref 写锁和原子替换，不要并发执行或删除活动进程持有的锁。
- `product:check` 校验清单、授权组合、`package.json`、同步保护路径、未跟踪文件和发行边界。它通过 Git 枚举文件，**必须在 Git 工作区执行**，不支持无 `.git` 的源码归档。
- 所有直接 Vite 构建命令都必须在启动 Vite 前且仅串联一次 `pnpm product:check`；这里的“仅一次”指单条构建脚本内部，完整验证仍可在构建前独立执行门禁。不要新增绕过门禁的构建脚本。
- `pnpm-lock.yaml` 纳入 Git，依赖安装统一用 pnpm；不要提交被忽略的 `package-lock.json` / `yarn.lock`。

跨发行同步时，保留目标仓的 `.thinglinks-product.env` 及其 `THINGLINKS_SYNC_PROTECTED_PATHS`。同步共享代码后，在目标仓依次执行 `product:render`、`product:check`、`product:test` 和生产构建。

## `VITE_*` 不是密钥存储

Vite 会把客户端可见变量写进静态资源，变量名含 `SECRET` 也不会变成秘密。现有 `VITE_GLOB_CLIENT_SECRET` 是浏览器 OAuth 兼容参数，能够被用户读取，**不得替换成真正的机密凭据**。

Google Maps 示例使用 `VITE_GOOGLE_MAPS_API_KEY`：

- 跟踪的 `.env` 默认留空；本地使用忽略的 `.env.local`，部署时由环境注入。不要把 `AIza...` 值写进组件或提交记录；
- 浏览器必须拿到该 Key，因此还要在供应商侧限制允许的域名和 API；
- 缺少 Key 时不加载脚本，页面显示三语言 `missingApiKey` 提示；
- 脚本加载失败或 `window.google.maps` 不可用时显示三语言 `loadFailed`，不能留下空白画布；
- URL 参数用 `encodeURIComponent`，不要打印完整脚本 URL。

## 扫描与日志边界

`pnpm product:test` 包含 `tests/source-secrets.test.mjs`，扫描自有 `src`、`build`、`public`、`scripts` 及根工程配置中的高可信 Google/AWS/GitHub Key 和私钥；第三方大体积资源目录明确排除。扫描通过 Git 纳入已跟踪和未忽略的未跟踪文件，因此完整 `product:test` 必须在 Git 工作区执行，被忽略的 `.env.local` 不在覆盖范围。它只是高可信模式门禁，**不能替代完整的历史/制品密钥扫描**；`product:check` 和生产构建也不能代替它。

构建配置日志只输出：

- 产品组件编码、公开版本、发行编码；
- 命令行覆盖项的键名和数量。

不要输出环境变量值、完整配置对象、Authorization 头或带 Key 的 URL。

推荐提交前顺序：

```bash
pnpm product:test
pnpm product:check
pnpm type:check
pnpm exec eslint --fix <changed-files>
pnpm exec eslint <changed-files>
pnpm build:prod
git diff --check
```
