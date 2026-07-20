---
name: thinglinks-web
description: >
  Use when developing the ThingLinks frontend console repo thinglinks-web-pro (Vue3 +
  Vben Admin + Ant Design Vue + Vite + TypeScript + Pinia): building IoT pages under
  src/views/iot (device / product / rule / OTA / operationMaintenance debug / accessControl),
  defining API calls with defHttp, using shared IoT components (IotProductPicker,
  IotDevicePicker, IotProductVersionPicker, ProductTopicPicker, ScriptDebugPanel,
  ScriptTemplatePicker, BusinessCardList 卡片列表/版本选择器), the rule
  script Groovy debug panel, Vben BasicForm/BasicTable/BasicModal with useForm/useTable/
  useModal, the CodeEditor (codemirror), menu-driven routing + v-hasPermission, adding i18n
  (zh-CN/en-US/ja), maintaining the Web product manifest and Vite build gates, handling
  browser-visible VITE configuration and source-secret checks, extending the rule-linkage
  alarm notification editor, or drawing flow diagrams (Excalidraw). Trigger whenever the user works
  on the 前端 / 控制台 / Vue page / 脚本调试面板 / 物模型编辑 / 产品配置 / 通知模板 of ThingLinks.
---

# ThingLinks Web (frontend console)

> 适用于 ThingLinks Web 管理控制台源码树；具体工作区映射见 `thinglinks-workspace`。产品身份、版本、发行信息与公开运行标识以根目录 `.thinglinks-product.env` 为准，不从检出目录名推断。

技术栈：**Vue 3 + Vben Admin + Ant Design Vue + Vite + TypeScript + Pinia + vue-i18n**。多租户构建(`VITE_GLOB_MULTI_TENANT_TYPE`:NONE / COLUMN / DATASOURCE_COLUMN)。

## 工作流

1. **加页面**:在 `src/views/iot/<域>/` 建页;数据/表单 schema 放 `*.data.tsx`;路由**后端菜单驱动**(不硬编码)。
2. **调接口**:在 `src/api/iot/<域>/` 定义 `Api` 对象 + 服务函数(`defHttp`);类型放 `model/`。
3. **复用组件**:优先用 `src/components/iot/` 的 IoT 业务组件 + Vben 基础组件(BasicForm/Table/Modal)。
4. **加文案**:`src/locales/lang/{zh-CN,en-US,ja}/...` **三处都改**。
5. **改产品/环境配置**:产品公开元数据只改 `.thinglinks-product.env`;真实密钥不进 `VITE_*`。
6. **校验**:`pnpm product:test` + `pnpm product:check`;再用 `pnpm exec eslint --fix <file>` / `pnpm exec eslint <file>`，发布前跑 `pnpm build:prod`。
7. **画图**:流程/架构图一律 **Excalidraw**。

## ⚠️ 重要(反幻觉/踩坑)

- 权限点匹配是**通配符**(`module:sub:action` / `module:*:action` / `*`);用 `v-hasPermission` 指令或 `usePermission().hasPermission`。
- codemirror 的 `EditorView` 从 **`codemirror`** meta 包导入(**不要** `@codemirror/view`,未 hoist);换行 `EditorView.lineWrapping`。
- API 统一返回 `{ code, message, data, timestamp }`,拦截器在 `utils/http/axios/axiosTransform.ts`。
- **所有 `VITE_*` 都是浏览器公开值**；变量名带 `SECRET` 也不能保存机密。Google Maps 只读 `VITE_GOOGLE_MAPS_API_KEY`，缺失或加载失败必须显示三语言兜底。
- Web 版本、包名、授权、公共 clientId 与前端 MQ 命名空间以产品清单为准；直接 Vite 构建必须先过 `product:check`，依赖统一使用已纳入 Git 的 `pnpm-lock.yaml`。
- 规则联动通知渠道编号固定为钉钉 `0` / 企业微信 `1` / 飞书 `2` / 站内信 `3`；接收人、占位符、预览和兼容字段见 `rule-linkage-notification.md`，不要按 Groovy 脚本的 `channelCode` 猜。
- **AntD 全局注册 + tree-shaking 坑**:只在模板用 `<a-xxx>`、没在入口按名 import 的 antd 组件,**生产构建**会被摇掉 → 运行时退化成原生元素(`a-card` 头部/`#extra` 整块消失等);**dev 正常、只生产构建/部署才丢**。`main.ts` 需显式 `app.use(Card).use(Typography)`(详见 `references/conventions.md`)。
- 组件/路径/约定随版本演进,核对真实代码。

## References Index

| File | Content | When to read |
| --- | --- | --- |
| [references/project-structure.md](references/project-structure.md) | 技术栈、`src/` 目录、构建脚本、多租户、i18n、store/字典 | 总体上手、找东西放哪 |
| [references/conventions.md](references/conventions.md) | 开发准则:按业务域放文件(iot/video/card…)、页面文件命名、组件约定、代码风格(ESLint/Prettier)、**Flexy 设计风格** | 新建页面/组件、对齐风格 |
| [references/api-request.md](references/api-request.md) | `defHttp`、`Api` 对象范式、ServicePrefixEnum、model、统一返回 | 写/改接口调用 |
| [references/routing-permission.md](references/routing-permission.md) | 菜单驱动路由、`v-hasPermission`、`usePermission`、通配权限点 | 加页面/按钮权限 |
| [references/ui-components.md](references/ui-components.md) | Vben BasicForm/Table/Modal + useForm/useTable/useModal、ApiSelect、CodeEditor、ECharts、IoT 共享组件 | 找组件/表单/表格/弹窗 |
| [references/iot-pages.md](references/iot-pages.md) | `src/views/iot` 模块地图(link/rule/mqs)+ 对应 api/组件 | 在某 IoT 域加页面 |
| [references/rule-script-debug.md](references/rule-script-debug.md) | `ScriptDebugPanel` props、`transformDebug` API 字段、codemirror、设备选择器 | 改规则脚本调试面板 |
| [references/product-build-security.md](references/product-build-security.md) | 产品清单、package 派生、Vite 构建门禁、公开环境变量、地图 Key 与源码密钥扫描 | 改版本/发行配置/构建脚本/浏览器配置 |
| [references/rule-linkage-notification.md](references/rule-linkage-notification.md) | 规则联动通知渠道、接收人、预设/变量、预览、提交兼容与统一校验 | 改告警动作/通知模板/通知渠道 |

## Assets

`assets/page-scaffold.md` — 标准 IoT 列表+编辑页脚手架(api / `data.tsx` / `index.vue`,复制改名即用)。

## 相关 skill

- **[`thinglinks-cloud`](../thinglinks-cloud/)** — 前端调用的后端:上行/下行链路、规则脚本契约、物模型、设备影子。

---

> **最后核对**：组件、路径和配置契约随版本演进，落地前核对当前源码与根目录产品清单。
