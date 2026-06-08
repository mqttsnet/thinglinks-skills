# 项目结构

`thinglinks-web-pro`,基于 Vben Admin。

## 技术栈

Vue 3.3 · Vben Admin · Ant Design Vue 3.2 · Vite 4 · TypeScript · Pinia · Vue Router 4 · vue-i18n 9 · ECharts 5 · vxe-table。

## `src/` 目录

| 目录 | 放什么 |
| --- | --- |
| `api/` | 接口定义(按业务分:`iot/link`、`iot/rule`、`iot/mqs`、`basic`、`sys`…) |
| `views/` | 页面(对应菜单);IoT 在 `views/iot/` |
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

## 构建脚本

```bash
npm run dev            # 开发(默认)
npm run dev:column     # COLUMN 租户
npm run dev:datasource # DATASOURCE_COLUMN 租户
npm run build:prod     # 生产构建
npm run type:check     # TS 检查
npm run lint:eslint    # ESLint
```
多租户:`.env.*` 的 `VITE_GLOB_MULTI_TENANT_TYPE`(NONE / COLUMN / DATASOURCE_COLUMN)。

## i18n(改文案三处)

`src/locales/lang/{zh-CN,en-US,ja}/<模块>/<文件>.ts`,按模块组织,嵌套 key。页面 `const { t } = useI18n(); t('iot.link.product.productName')`(`.` 连接路径)。**新增文案中/英/日三处都加**。

## 状态 / 字典

- Pinia:`useUserStore()`(用户/权限)、`useDictStoreWithOut().getDictByCode('device_status')`(数据字典,main.ts 里 `registerDictTypes` + `loadAllRegisteredDicts`)。
- 缓存:`utils/cache`(local/session 包装)。
