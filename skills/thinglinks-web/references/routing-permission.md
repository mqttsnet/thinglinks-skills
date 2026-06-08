# 路由 + 权限

## 菜单驱动路由

- `basicRoutes`(`router/routes`)= 静态白名单(登录/404…);
- **业务路由由后端菜单动态生成**:登录后拉权限菜单 → `store/modules/permission.ts` 解析菜单树 → 生成动态路由 addRoute;
- 页面组件 `name` 用于缓存(如 `'规则脚本'`);详情路由名常用 `useDetailRoute()` 动态取。
- 守卫:`router/guard/`(登录检查、权限验证、菜单加载)。

## 按钮/接口权限

- **指令** `v-hasPermission`(`directives/permission.ts`):
  ```vue
  <a-button v-hasPermission="['rule:groovy:ruleGroovyScript:mockDebug']">调试</a-button>
  ```
- **Hook** `usePermission()`(`hooks/web/usePermission.ts`):
  ```ts
  const { hasPermission } = usePermission();
  if (hasPermission(['system:menu:delete'])) { /* ... */ }
  ```
- 权限点是**通配符**(`WildcardPermission`):`module:sub:action`、`module:*:action`、`*`(支持隐含匹配)。

## 加一个 IoT 页面(典型流程)

1. `views/iot/<域>/<entity>/`:`index.vue`(列表,BasicTable)+ `Edit.vue`(BasicModal+BasicForm)+ `detail.vue` + `<entity>.data.tsx`(列/搜索/表单 schema);
2. `api/iot/<域>/<entity>.ts` + `model/`;
3. 三语 i18n;
4. 后端配菜单 + 权限点(前端不硬编码路由)。
