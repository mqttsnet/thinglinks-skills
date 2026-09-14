# 页面脚手架(标准 IoT 列表 + 编辑页)

复制改名即用。一个实体页三件套:**api**(接口)→ **`<entity>.data.tsx`**(schema)→ **`index.vue`**(列表)+ **`Edit.vue`**(模态)。命名/放置见 `references/conventions.md`,组件见 `references/ui-components.md`,接口范式见 `references/api-request.md`。占位用 `<...>` 标注,落地按真实枚举/路径核对。

## 1. api —— `src/api/iot/<域>/<entity>.ts`

```ts
import { defHttp } from '/@/utils/http/axios';

enum Api {
  list = '/<svc>/<entity>/page',
  save = '/<svc>/<entity>',
  detail = '/<svc>/<entity>/',
  remove = '/<svc>/<entity>/',
}

export const pageList = (params) => defHttp.get({ url: Api.list, params });
export const saveOrUpdate = (data, isUpdate: boolean) =>
  isUpdate ? defHttp.put({ url: Api.save, data }) : defHttp.post({ url: Api.save, data });
export const getDetail = (id) => defHttp.get({ url: Api.detail + id });
export const removeById = (id) => defHttp.delete({ url: Api.remove + id });
```

## 2. schema —— `src/views/iot/<域>/<entity>/<entity>.data.tsx`

```tsx
import { BasicColumn, FormSchema } from '/@/components/Table';
import { useI18n } from '/@/hooks/web/useI18n';
const { t } = useI18n();

export const columns = (): BasicColumn[] => [
  { title: t('...'), dataIndex: 'name' },
  { title: t('...'), dataIndex: 'status' },
];

export const searchFormSchema = (): FormSchema[] => [
  { field: 'name', label: t('...'), component: 'Input', colProps: { span: 8 } },
];

// 注意签名:29/30 个页面都收 `_type`,用它区分新增/编辑(如编辑时禁改主键)
export const editFormSchema = (_type: Ref<ActionEnum>): FormSchema[] => [
  { field: 'id', label: 'id', component: 'Input', show: false },
  { field: 'name', label: t('...'), component: 'Input', required: true },
];

// 需要跨字段联动/动态校验时再加,签名固定 `(_)`
export const customFormSchemaRules = (_): Partial<FormSchemaExt>[] => [];
```

> 四个导出名是约定俗成的(`columns` / `searchFormSchema` / `editFormSchema` /
> `customFormSchemaRules`,卡片视图再加 `cardFields`),照抄别自创。

## 3. 列表 —— `src/views/iot/<域>/<entity>/index.vue`

```vue
<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button type="primary" v-hasAnyPermission="['<m>:<e>:add']" @click="openModal(true, { isUpdate: false })">
          {{ t('common.addText') }}
        </a-button>
      </template>
      <template #action="{ record }">
        <TableAction
          :actions="[
            { label: t('common.editText'), onClick: () => openModal(true, { record, isUpdate: true }) },
            { label: t('common.delText'), color: 'error', popConfirm: { title: '确认删除?', confirm: () => handleDelete(record) } },
          ]"
        />
      </template>
    </BasicTable>
    <Edit @register="registerModal" @success="reload" />
  </div>
</template>

<script lang="ts" setup>
  import { BasicTable, useTable, TableAction } from '/@/components/Table';
  import { useModal } from '/@/components/Modal';
  import { useI18n } from '/@/hooks/web/useI18n';
  import { columns, searchFormSchema } from './<entity>.data';
  import { pageList, removeById } from '/@/api/iot/<域>/<entity>';
  import Edit from './Edit.vue';

  defineOptions({ name: '<Entity>List' });
  const { t } = useI18n();
  const [registerModal, { openModal }] = useModal();
  const [registerTable, { reload }] = useTable({
    api: pageList,
    columns: columns(),
    formConfig: { labelWidth: 100, schemas: searchFormSchema() },
    useSearchForm: true,
    showTableSetting: true,
    actionColumn: { width: 160, title: t('common.action'), dataIndex: 'action', slots: { customRender: 'action' } },
  });
  async function handleDelete(record) {
    await removeById(record.id);
    reload();
  }
</script>
```

> `Edit.vue` = `BasicModal` + `BasicForm`:`useModalInner` 拿 `isUpdate/record` → `setFieldsValue`,提交前 `validate()` → `saveOrUpdate`,`emit('success')` 关弹窗刷列表。权限点 `<m>:<e>:add` 见 `references/routing-permission.md`。
