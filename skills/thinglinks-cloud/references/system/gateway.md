# 网关(thinglinks-gateway)

响应式 **Spring Cloud Gateway(WebFlux)**,非 MVC。集成 Sa-Token(reactor)+ Sentinel 限流 + Nacos 动态路由。

## 路由:Nacos 动态,两层

(`docs/config/nacos/DEFAULT_GROUP/thinglinks-gateway-server.yml`)
1. `discovery.locator.enabled: true` —— 按服务名自动路由;
2. 显式 `routes:`:`uri: lb://thinglinks-<x>-server`、`predicates: Path=/<x>/**`、`filters: StripPrefix=1`(WebSocket 用 `lb:ws://`,如 base/link/mqs)。

静态 `application.yml` 只放 Nacos/Sentinel bootstrap + import common/redis/database/rocketmq。

## 认证 / 上下文过滤器(`gateway/filter/`,按 `OrderedConstant` 排序)

- `AuthenticationSaInterceptor`(核心门):除 `IgnoreProperties` 放行表外 `StpUtil.checkLogin()`;再按 `ResourceApiLocalCache.getAllApi()`(URI###METHOD→权限,本地缓存零 Redis)做 `StpUtil.checkPermissionOr(...)`;未登记 URI 默认拒(除非 `notConfigUriAllow`)。
- `TokenContextFilter`:解析 Sa-Token 会话 → 注入下游 **header**(租户 id、用户 id、公司/部门/员工 id、客户端、trace);非生产支持 `TEST_TOKEN` 旁路。
- 灰度 `GrayscaleReactiveLoadBalancerClientFilter`(按 Nacos `gray_version` 元数据);另 `TraceFilter`/`ContextPathFilter`/`CommonResponseDecorator`。

## 限流 / CORS / 放行

- **限流**:Sentinel 网关适配(规则来自 `sentinel-datasource-nacos`),非自写过滤器。
- **CORS**:`gateway/config/CorsConfiguration`,`@Order(MIN_VALUE)` `corsFilter()`,放行 `*` + 处理 OPTIONS 预检。
- **访问表** `IgnoreProperties`(前缀 `thinglinks.ignore`):`anyone`(登录免 uri 权限)/ `anyUser`(免登录需租户)/ `anyTenant`(免登录免租户)/ `baseUri`(静态资源)/ `inner`(经网关拒绝);`authEnabled`、`notConfigUriAllow` 开关。
- **内部 RPC**:`/inner/**` 只给 Feign 服务名直连,网关命中即拒绝。迁移规则见 `../security/internal-api-governance.md`。

## 开放平台网关 `sop-gateway`(独立 app)

Gitee SOP(包 `com.gitee.sop`,context `/sopgateway`),给**第三方 ISV** 签名访问:`RSAUtil`/`AESUtil` 验签、`IsvKeys`/`ApiInfo`、`TokenValidateInterceptor`+`ResultRouteInterceptor`+`GenericServiceInvoker`。**不走 Sa-Token 登录**,按 API `isNeedToken` + app-auth-token/ISV 签名鉴权。

## ⚠️ 反幻觉

- 网关是 WebFlux 响应式,别按 servlet/MVC 过滤器写。
- 令牌在**网关**统一校验,下游服务**信任网关注入的 header**(不复验 token,见 `auth.md`)。
- 内部 Feign 路径不要放进 `anyUser`;用 `/inner` 并保持 header 透传。
- 路由在 Nacos,改路由改配置不改码。
- 类名/行号随版本演进,核对真实代码。
