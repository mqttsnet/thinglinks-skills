# API / 请求层

## defHttp(`utils/http/axios`)

Axios 封装(`VAxios`)。统一返回 `{ code, message, data, timestamp }`,拦截器在 `utils/http/axios/axiosTransform.ts` 解包。

```ts
import { defHttp } from '/@/utils/http/axios';
const res = await defHttp.get({ url: '/api/xxx', params: {...} });
```

## Api 对象范式(约定)

`src/api/<模块>/<entity>.ts`:定义 `Api` 对象(url + method)+ 导出服务函数。

```ts
import { defHttp } from '/@/utils/http/axios';
import { RequestEnum, ServicePrefixEnum } from '/@/enums/httpEnum';

const MODULAR = 'ruleGroovyScript';
const Prefix = ServicePrefixEnum.RULE;   // 各服务前缀(BASE/LINK/RULE/MQS…)

export const Api = {
  Page:   { url: `${Prefix}/${MODULAR}/page`,   method: RequestEnum.POST },
  Detail: { url: `${Prefix}/${MODULAR}/detail`, method: RequestEnum.GET },
  Save:   { url: `${Prefix}/${MODULAR}`,         method: RequestEnum.POST },
  Update: { url: `${Prefix}/${MODULAR}`,         method: RequestEnum.PUT },
  Delete: { url: `${Prefix}/${MODULAR}/{id}`,    method: RequestEnum.DELETE },
};

export function pageXxx(data: PageQuery) {
  return defHttp.post<PageResult<XxxVO>>({ ...Api.Page, data });
}
```

## 类型 / Model

`src/api/<模块>/model/<entity>Model.ts` —— 导出 VO / Request / Response TS 类型。

## IoT 接口位置

`src/api/iot/`:`link`(product/device/productCommand/productProperty/productService/productTopic/group/ota/operationMaintenance)、`rule`(alarm/engine/groovy/plugin/integration)、`mqs`(bus)。结构对标 `views/iot/`。

> 规则脚本接口:`api/iot/rule/groovy/ruleGroovyScript.ts`(page/detail/save/update/delete/copy/execStat)、`transformDebug.ts`(debugTransform);字段见 `rule-script-debug.md`。
