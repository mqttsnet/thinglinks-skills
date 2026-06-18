# UI 组件(Vben 基础 + IoT 共享)

## Vben 三件套(Hook 注册式)

| 组件 | Hook | 配置 |
| --- | --- | --- |
| `BasicForm`(`components/Form`) | `useForm()` | `schemas: FormSchema[]`(field/label/component/required/slot/colProps…) |
| `BasicTable`(`components/Table`) | `useTable()` | columns、actionColumn、分页;`TableAction` 行操作 |
| `BasicModal`(`components/Modal`) | `useModal()` / `useModalInner()` | openModal/closeModal、setModalProps |

```ts
const [registerForm, { validate, setFieldsValue, clearValidate }] = useForm({ labelWidth: 120, schemas });
const [registerTable, { reload, getForm }] = useTable({ columns, actionColumn });
const [registerModal, { openModal, closeModal }] = useModal();
```
异步选择器:`ApiSelect` / `ApiTreeSelect` / `ApiCascader` / `ApiRadioGroup` / `ApiTransfer`(`components/Form/src/components`)。

## 代码编辑器(CodeEditor / codemirror)

`components/CodeEditor`,支持 groovy/java/json/sql 等,主题 `one-dark`。
- ⚠️ `EditorView` 从 **`codemirror`** meta 包导入(`import { EditorView } from 'codemirror'`),**不要** `@codemirror/view`(未 hoist);换行 `EditorView.lineWrapping`。

## 图表

`useECharts(ref)`(`hooks/web/useECharts`)→ `setOption({...})`。echarts 5 + amap 扩展。

## IoT 共享组件(`components/iot`,从 `/@/components/iot` 导入)

| 组件 | 用途 |
| --- | --- |
| `IotProductPicker` / `IotDevicePicker`(`components/iot/IotProductDevicePicker`) | 选产品 / 选该产品下设备(无产品自动禁用)→ 标准"选产品→选设备";用于 ACL 设备级规则、WS/MQTT 调试页"按设备"模式(选中自动回填 clientId/账号 或拼命令 topic) |
| `IotProductVersionPicker`(`components/iot/IotProductVersionPicker`) | 按发布策略列产品可绑定版本:`v-model` 绑 `versionNo`;`productIdentification`(空则禁用并提示"先选产品")/`publishStrategies`(对齐 `enums/link/productVersion.ts` `ProductPublishStrategyEnum` 0全量/1灰度/2影子,默认三种全支持)/`allowCustom`(允许手填不在列表的版本号)/`disabled`。内部仅列「可绑定」版本(版本状态 已发布/灰度/影子),选项内联 版本号+策略标签+发布时间+备注,选后摘要 + 空态提示。用于 `device/device/Edit.vue`(绑定版本,全策略)、`device/running/index.vue`(影子版本切换)、`ota/otaUpgrades/Edit.vue`(`:publish-strategies="[SHADOW]" allow-custom`,选目标影子版本) |
| `ProductTopicPicker`(+ Modal) | 主题模式选择(基础 + 自定义双模式) |
| `ScriptDebugPanel` | 规则脚本在线调试面板(见 `rule-script-debug.md`) |
| `ScriptTemplatePicker` | 脚本模板/骨架选择 |
| `AclTopicMatcherTesterModal` | ACL 主题正则匹配测试 |
| `BasicDeviceSelector` / `BasicSelectDeviceModal` | 设备选择器 / 弹窗 |
| `AllOrCustomPicker`(+ Modal)/ `IotAllOrCustomProductPicker` / `IotAllOrCustomDevicePicker` | 全选/自定义选择 |
| `BasicEntityPicker`(+ Modal) | 通用实体选择(自定义数据源) |
| `SecretField` | 密钥脱敏显示 |
| `PropertyMethodBadge` | 属性读写徽章(R/RW/RE/RWE) |
| `PropertyTrendChart` | 属性趋势图 |
| `ProductVersionDiffViewer` / `ProductChangeLogPanel` / `SnapshotIdTag` | 版本对比 / 变更日志 / 快照标签 |
| `BindingKvTable` | 数据驱动 KV 表(调试变量检视) |
| `components/iot/ota/svg` | OTA 场景 SVG 图标聚合(`from '/@/components/iot/ota/svg'`):`getOtaPackageTypeSvg(packageType)` 按升级包类型取图(0软件包→`SoftwarePackageSvg` / 1固件包→`FirmwarePackageSvg`,对齐后端 `OtaPackageTypeEnum`)、`OtaTaskSvg`(升级任务)、`OtaRecordStatusBadge`(props `status` 0待升/1升级中/2成功/3失败 或 'total' + `size`;升级中旋转 / 待升呼吸,渐变徽标)。作 `BusinessCardList` 的 `#cardImage` 用于 OTA 各列表页,也用于详情页 header |

均 `withInstall()` 包装,可按需引入。

## BusinessCardList(跨域共享卡片视图)

`src/components/BusinessCardList`(从 `/@/components/BusinessCardList` 导入)。BasicTable `#cardView` 插槽内渲染的**通用 Flexy 卡片列表**,设备 / OTA / 北向集成等页面统一观感(Flexy 卡片 + 状态圆点 + 右上徽章)。自带分页、新增/详情/编辑/删除按钮与权限控制,数据由 `pageApi` 拉取。

| Prop | 说明 |
| --- | --- |
| `pageApi`(必填) | 分页查询函数,须返回 `{ records, total }`(内部按 `current/size + searchData` 调用) |
| `deleteApi` | 单条删除函数(传 `id`);不传则 emit `delete` 由外部处理 |
| `searchData` | 搜索表单数据(由 BasicTable `#cardView` 透传) |
| `title` / `nameField` / `nameFallback` | 标题 / 卡片名取自哪个字段(默认 `name`)/ 名称缺省文本 |
| `fields`(`CardField[]`) | 卡片展示字段:`{ label, field(支持 'a.b' 点号路径), dictType?, span? }` |
| `statusField` + `statusResolver` | 右下角状态标签:传 `statusResolver(record) => { label, cls }` 渲染**多态状态**;不传则按 `statusOnlineValue` 回退在线/离线二态(`cls` 取 `online`/`offline`/`unconnected`/`info`/`danger`) |
| `badgeField` + `badgeDictType` | 右上角徽章字段 + 字典翻译 |
| `permissions`(`CardPermissions`) | `{ add, edit, delete, view }` 权限码,控制对应按钮显隐(`v-hasAnyPermission`) |
| `detailRouteName` | 详情路由名;不传则自动查找,无路由时隐藏详情按钮 |
| `editModal` | 编辑弹窗组件(内部 `useModal` 注册,新增/编辑直接打开) |
| `extraActions`(`CardAction[]`) | 额外操作按钮 `{ tooltip, icon, event, permission?, iconSize?, disabled? }`,点击 emit `extraAction({event, record})` |

- 插槽:`#headerExtra`(标题栏右侧加按钮,如"添加设备升级")、`#cardImage="{ record }"`(自定义卡片右侧图,默认 `DefaultCardSvg`)、`#cardActions="{ record }"`。
- emit:`add` / `edit` / `view` / `delete` / `extraAction` / `input`(切回表格视图);`defineExpose({ reload })`。
- 导出:`BusinessCardList`、`DefaultCardSvg` + 类型 `CardField` / `CardAction` / `CardPermissions` / `BusinessCardListProps`(`index.ts`)。
