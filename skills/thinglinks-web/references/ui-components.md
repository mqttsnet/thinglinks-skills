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
| `IotProductPicker` / `IotDevicePicker` | 选产品 / 选该产品下设备(无产品自动禁用)→ 标准"选产品→选设备" |
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

均 `withInstall()` 包装,可按需引入。
