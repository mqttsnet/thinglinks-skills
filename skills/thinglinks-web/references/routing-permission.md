# 路由 + 权限

## 菜单驱动路由

- `basicRoutes`(`router/routes`)= 静态白名单(登录/404…);
- **业务路由由后端菜单动态生成**:登录后拉权限菜单 → `store/modules/permission.ts` 解析菜单树 → 生成动态路由 addRoute;
- 页面组件 `name` 用于缓存(如 `'规则脚本'`);详情路由名常用 `useDetailRoute()` 动态取。
- 守卫:`router/guard/`(登录检查、权限验证、菜单加载)。

## 按钮/接口权限

`directives/permission.ts` 注册了**五个**指令,语义按「所有 / 任意」× 「拥有 / 没有」区分:

| 指令 | 语义 | 用量 |
| --- | --- | --- |
| `v-hasAnyPermission` | 拥有列表里**任意一个** | **102 处 —— 事实上的默认写法** |
| `v-hasPermission` | 拥有列表里**全部** | 6 处 |
| `v-auth` | 同 `hasPermission`(拥有全部) | 少量 |
| `v-withoutPermission` | **没有**全部 | 少量 |
| `v-withoutAnyPermission` | **没有**任意一个 | 少量 |

```vue
<!-- 跟着代码库的主流写法来:单个权限点也用 hasAnyPermission -->
<a-button v-hasAnyPermission="['rule:groovy:ruleGroovyScript:mockDebug']">调试</a-button>
```

⚠️ **传多个权限点时两者结果不同**:`v-hasPermission` 要求全部命中,`v-hasAnyPermission`
命中一个即可。想表达「有其中之一就能看」却写了 `v-hasPermission`,按钮会对大部分角色消失,
而这类问题在自己的管理员账号上测不出来。

脚本里判断用 **Hook** `usePermission()`(`hooks/web/usePermission.ts`):

```ts
const { hasPermission } = usePermission();
if (hasPermission(['system:menu:delete'])) { /* ... */ }
```

权限点是**通配符**(`WildcardPermission`):`module:sub:action`、`module:*:action`、`*`(支持隐含匹配)。

## 加一个 IoT 页面(典型流程)

1. `views/iot/<域>/<entity>/`:`index.vue`(列表,BasicTable)+ `Edit.vue`(BasicModal+BasicForm)+ `detail.vue` + `<entity>.data.tsx`(列/搜索/表单 schema);
2. `api/iot/<域>/<entity>.ts` + `model/`;
3. 三语 i18n;
4. 后端配菜单 + 权限点(前端不硬编码路由)。
