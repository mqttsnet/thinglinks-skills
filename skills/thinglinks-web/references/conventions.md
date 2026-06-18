# 开发准则(文件放置 + 命名 + 代码风格 + Flexy)

## 1. 按业务域放文件

`src/views/`、`src/api/`、`src/locales/lang/{zh-CN,en-US,ja}/` **三处同名域目录一一对应**。新功能放进对应域,**不要乱放**:

| 域 | 覆盖 |
| --- | --- |
| `iot/` | 物联网核心(link 产品/设备/规则/物模型;rule 规则引擎;mqs) |
| `video/` | 视频监控(设备/通道/录制/告警/dashboard) |
| `card/` | 物联卡(SIM/流量) |
| `basic/` | 系统基础(用户/角色/权限/流程) |
| `devOperation/` | 开发运维(应用/租户/开发者) |
| `thinglinks/` | 平台通用 |
| `sys/` `open/` `demo/` | 系统页 / 开放平台 / 示例 |

> 例:新增视频通道页 → `views/video/channel/` + `api/video/channel.ts` + `locales/lang/*/video/channel.ts`。

## 2. 页面目录文件命名

一个实体页目录(如 `views/iot/link/device/device/`)的标准文件:

| 文件 | 用途 |
| --- | --- |
| `index.vue` | 列表(BasicTable / 卡片视图) |
| `Edit.vue`(PascalCase) | 新增/编辑模态(BasicModal + BasicForm) |
| `detail.vue` 或 `detail/index.vue` | 详情(多 Tab) |
| `<feature>.vue`(camelCase) | 详情子 Tab/面板,如 `basicInfo.vue`、`modelDefinition.vue` |
| `<Feature>Modal.vue` | 业务模态,如 `PublishModal.vue`、`ImportModal.vue` |
| `<entity>.data.tsx` | schema:`columns()` 列 + `cardFields()` 卡片字段 + `createFormSchema()` 表单 |
| `components/` | 页面局部子组件 |

## 3. 组件约定

- **全局共享** → `src/components/`(通用)/ `src/components/iot/`(IoT 业务);PascalCase;`withInstall` 包装(`index.ts` 导出 + `src/Component.vue`)。
- **页面局部** → 页面目录下 `components/` 或同级 `.vue`。
- 优先复用已有组件(见 `ui-components.md`),不重复造。
- **分段切换**(手动/按设备、报文类型这类二选一)用 `<a-radio-group :options option-type="button">`(数据驱动、单组件),**别堆** `<a-radio-button>` 子组件 —— 单组件渲染更稳、更易维护(WS/MQTT 调试页实践)。

## ⚠️ AntD 全局注册 tree-shaking 坑(dev 正常、生产**构建**才丢组件)

项目用 `main.ts` 的 `app.use(Antd)` **全局注册**(无 unplugin 自动引入)。**只在模板里用 `<a-xxx>`、且全项目从没在"入口可达处"按名 `import { Xxx } from 'ant-design-vue'` 的组件,会被生产构建 tree-shaking 掉** → 运行时 `resolveComponent("a-xxx")` 失败 → **退化成原生元素**(忽略 props/slots:如 `a-card` 的 `title`/`#extra` 整个头部不渲染、`a-typography-*` 失效)。

- **dev 不暴露**:Vite 用 esbuild 预打包 antd,不做这种摇树 → 本地一切正常,**只有生产构建/部署才丢**(排查时务必用生产产物,别只看 dev)。
- 已踩中的:`Card`(`a-card` 头部/`#extra` 消失)、`Typography`(`a-typography-paragraph`)。注意:在懒加载页里按名 import 也救不了——只本地用、不等于全局注册。
- **修复**:在 `main.ts` 入口**按名 import + 显式 `app.use()`**:
  ```ts
  import Antd, { Card, Typography } from 'ant-design-vue';
  app.use(Antd).use(Card).use(Typography); // 防止只在模板用的组件被摇掉
  ```
- **自查**(在部署产物的页面 Console 跑):
  ```js
  const c = document.querySelector('#app').__vue_app__._context.components;
  ['ACard','ATypography'].filter(n => !(n in c)); // 非空 = 这些组件没注册 = 会退化成原生元素
  ```
  把页面用到的全部 `A` 前缀组件名列进去,**空数组才安全**。

## 4. 代码风格(ESLint + Prettier + Stylelint 强制)

| 维度 | 规则 |
| --- | --- |
| 引号 | **单引号** |
| 分号 | **必须** |
| 缩进 | **2 空格** |
| 行宽 | Prettier `printWidth: 100`,ESLint `max-len: 140` |
| 尾逗号 | `all` |
| 组件名 | PascalCase;`vue/multi-word-component-names` off(允许单词名) |
| `@update:modelValue` | 用 `@update:model-value`(`vue/v-on-event-hyphenation` 倾向连字符,见 ScriptDebugPanel 实践) |
| TS | `strict`;`no-explicit-any` off;`no-unused-vars` error(`_` 前缀变量可忽略) |
| Style | Less + scoped;`::v-deep`/`:deep()` 允许;支持 `rpx` |

改完一律 `npx eslint --fix <file>` 再 `npx eslint <file>`(warning 不阻断,error 清掉)。

## 5. Flexy 设计风格

**Flexy** 是平台的一套**设计语言**(不是组件库):面向 IoT/Video 仪表盘的**极简卡片式**风格 —— 白底 + 彩色点缀、卡片布局、统计面板、高对比徽标、蓝/绿/紫 tone 色系。

落地约定:
- **色系**:`src/settings/designSetting.ts` 的 `APP_PRESET_COLOR_LIST`(`#0960bd` 蓝 / `#009688` 绿 / `#8165FF` 紫 / `#ff5c93` / `#ee4f12` …);徽标如 `PropertyMethodBadge`(R 蓝 / W 橙 / RW 紫 / 未知灰)。
- **卡片结构类**:模态内用 `.flexy-header` / `.flexy-body` / `.flexy-card` 命名空间(参考 `views/iot/link/product/detail/PublishModal.vue`)。
- ⚠️ **Flexy 弹窗 CSS 常故意非 scoped**:因为 BasicModal `teleport` 到 body,scoped 选择器命中不到 → 用带 `.publish-flexy-wrap` 等命名空间的全局样式(组件内有注释说明)。
- 参考实现:`product/detail`(header / PublishModal / modelDefinition / publishRecord / `StrategyResultPanel.vue`)、`video/dashboard/stats`、`components/iot/svg`、`PropertyMethodBadge`、`link/operationMaintenance/debug`(WS/MQTT 调试:全宽分段切换 + 高亮设备区块 + 状态圆点 chip)。
  - `StrategyResultPanel.vue`:发布后「战报」面板,接收单个 `result: StrategyResultDTO`,按策略渲染 全量(切换数/占比条)/ 灰度(命中数 + 多组明细 `canary.groups` + 来源 group/manual/percent)/ 影子(预建稳定版数);在 `publishRecord.vue` 用 `record.canaryResult` 喂入(`retryCount/maxRetryCount` 则在 `PublishRecordDetailModal.vue` 展示)。
  - `PublishModal.vue` 新增:`maxRetryCount`(默认 3)、灰度改**多组(设备名单)**(分组多选合并去重 + 手填白名单解析,去百分比)、灰度发布前的**影响范围**说明(命中→新版本 / 其余 + 灰度期新设备→稳定版)。

> 新做仪表盘/详情/发布类页面,优先沿用 Flexy 卡片 + tone 色系,与既有页面观感一致。
