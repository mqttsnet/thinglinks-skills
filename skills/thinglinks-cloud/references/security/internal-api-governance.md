# 内部接口治理(`/inner/**`)

## 分类

| 前缀 | Token | TenantId | 经网关 | 用途 |
| --- | --- | --- | --- | --- |
| 普通接口 | 需要 | 需要 | 允许 | 业务接口,走 uri 权限 |
| `/anyone/**` | 需要 | 需要 | 允许 | 登录即可,不校验 uri 权限 |
| `/anyUser/**` | 不需要 | 需要 | 允许 | 对外免登录但需租户,如登出/字典/签名 webhook |
| `/anyTenant/**` | 不需要 | 不需要 | 允许 | 登录/验证码/注册/门户 |
| `/inner/**` | 不需要 | 按需透传 | **拒绝** | 服务间内部 RPC(服务名直连) |

## 规则

- 内部 RPC 用 `/inner/<domain>`;不要放在 `/anyUser` 或 `/anyTenant` 下。
- 客户端接口上的路径与 controller `@RequestMapping("/inner/xxx")` 必须成对 ——
  旗舰版写在 `@HttpExchange("/inner/xxx")`,社区版写在 `@FeignClient(path="/inner/xxx")`。
  **两种写法不通用,动手前先按 `../system/service-rpc.md` 确认版本线。**
- 内部调用直连服务名(`thinglinks-xxx-server`),不经过网关;网关命中 `/inner/**` 应直接拒绝。
- 内部调用仍要透传 `TenantId`、trace、灰度等 header;下游依赖 `HeaderThreadLocalInterceptor` / `ContextUtil` 重建上下文。
  透传由框架层拦截器统一做(旗舰 `HttpServiceHeaderInterceptor`),业务代码不用手写。
- 对外免登录接口若保留在 `anyUser/anyTenant`,写操作或敏感数据必须有业务签名/校验。

## 迁移检查

1. 先确认调用方:前端/开放平台/设备侧可达的接口不要机械迁到 `/inner`。
2. 改 controller path、客户端接口 path、fallback、facade、boot/cloud impl 的类名和包名;
   旗舰版还要同步 `*ServerHttpServiceConfiguration` 里的 `@ImportHttpServices` / `@HttpServiceFallback`。
3. 扫 `AnyUser` / `OpenAnyUser` / `anyuser` / 变量名残留,只保留语义真实对外的命名。
4. 更新 Nacos `thinglinks.ignore.inner` 两种形态:`/*/inner/**` 和 `/inner/**`。
5. 验证:网关访问 `/xxx/inner/**` 被拒;服务间直连可调;租户库切换仍正确。
