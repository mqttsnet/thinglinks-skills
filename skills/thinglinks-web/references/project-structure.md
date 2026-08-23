# 项目结构

ThingLinks Web 管理控制台，基于 Vben Admin。产品/发行身份以根目录 `.thinglinks-product.env` 为准。

## 技术栈

Vue 3.3 · Vben Admin · Ant Design Vue 3.2 · Vite 4 · TypeScript · Pinia · Vue Router 4 · vue-i18n 9 · ECharts 5 · vxe-table。

## `src/` 目录

| 目录 | 放什么 |
| --- | --- |
| `api/` | 接口定义(按业务分:`iot/link`、`iot/rule`、`iot/mqs`、`basic`、`sys`…) |
| `views/` | 页面(对应菜单),按业务域分顶层目录 —— 见下 |
| `components/` | 组件:Vben 基础(Form/Table/Modal/CodeEditor…)+ 业务 `components/iot/` |
| `store/` | Pinia(app/user/permission/dict/locale/multipleTab…) |
| `router/` | 路由 + 守卫(动态菜单驱动) |
| `hooks/` | `core/` `web/`(useForm/useTable/useModal/usePermission/useI18n/useECharts…) |
| `directives/` | 全局指令(`permission`/loading/clickOutside…) |
| `locales/lang/` | i18n:`zh-CN` / `en-US` / `ja` |
| `enums/` | 枚举(commonEnum/httpEnum/`perm`/`link`…) |
| `utils/` | `http`(axios)/`auth`/`cache`/`iot`/`helper`/`factory`/`thinglinks` |
| `settings/` `design/` | 全局配置 / 样式 token |
| `types/` `logics/` `layouts/` `plugins/` | 类型 / 初始化 / 布局 / 插件 |

### `views/` 顶层分域

| 目录 | 放什么 |
| --- | --- |
| `iot/` | 物联网:`link` / `rule` / `mqs`(地图见 `iot-pages.md`) |
| `video/` `card/` | 视频监控 / 物联卡 |
| `thinglinks/` | 平台自有页:`home` 首页、**`profile` 个人中心**、`more`、`test` |
| `basic/` | 平台基础:租户 `myTenant`、应用 `application`、消息 `msg`、用户 `user`、`system`、`base` |
| `devOperation/` | 运维侧:租户 `tenant`、应用、开发者、`sop` 开放平台、`ops` |
| `open/` | 免登录页:开放文档 `doc`、`code`、`help`、`sign`、`welcome` |
| `sys/` | 框架页:登录、锁屏、异常、iframe、重定向 |

> 找不到某个页面时先按域猜目录,不要默认「所有业务页都在 `views/iot`」。

### 个人中心的 MCP 凭证页

`views/thinglinks/profile/` 下的 `McpCredential.vue` + `McpCredentialModal.vue`,
接口 `api/basic/system/defMcpCredential.ts`(走 `ServicePrefixEnum.SYSTEM`),
样式 `design/profile/mcp-credential-modal.less`,文案在三语言 `thinglinks/profile.ts`。

这是 AI 客户端接入 ThingLinks MCP 服务的**唯一凭证来源**,页面行为有几条不能想当然:

- **列表不下发明文**,只给脱敏串;明文走单独的 `detail` 接口,由「查看」触发。
  所以凭证**不是只能看一次**,随时可以再查出来
- `detail` 同时返回拼好的 `clientConfig`(带 `mcpServers` 容器)与 `serverEntryConfig`
  (单条目),页面用 Tab 切换并提供复制。**地址由后端给,前端不要用当前域名拼**
- 编辑**只允许改名称** —— 有效期签发后不可变;启停走 `updateStatus` 单独接口,与删除不同
- 新建后的展示与「查看」复用同一块面板,靠 `justCreated` 区分文案

> 模型侧怎么用这些凭证、连不上怎么查,见 [`thinglinks-ai`](../../thinglinks-ai/) skill 的
> `server/client-integration.md`。

## 构建脚本

```bash
pnpm dev                # 开发(默认)
pnpm dev:column         # COLUMN 租户
pnpm dev:datasource     # DATASOURCE_COLUMN 租户
pnpm build:prod         # product:check 后生产构建
pnpm type:check         # TS 检查
pnpm lint:eslint        # 全量 ESLint --fix
pnpm product:test       # 产品配置/通知/安全等 Node 回归
pnpm product:check      # 清单、package、同步边界门禁
```
多租户:`.env.*` 的 `VITE_GLOB_MULTI_TENANT_TYPE`(NONE / COLUMN / DATASOURCE_COLUMN)。所有直接 Vite 构建脚本都先执行 `product:check`；细节见 `product-build-security.md`。

依赖统一由纳入 Git 的 `pnpm-lock.yaml` 固定；`package-lock.json` / `yarn.lock` 被忽略，不要混用包管理器。

## i18n(改文案三处)

`src/locales/lang/{zh-CN,en-US,ja}/<模块>/<文件>.ts`,按模块组织,嵌套 key。页面 `const { t } = useI18n(); t('iot.link.product.productName')`(`.` 连接路径)。**新增文案中/英/日三处都加**。

## 状态 / 字典

- Pinia:`useUserStore()`(用户/权限)、`useDictStoreWithOut().getDictByCode('device_status')`(数据字典,main.ts 里 `registerDictTypes` + `loadAllRegisteredDicts`)。
- 缓存:`utils/cache`(local/session 包装)。
