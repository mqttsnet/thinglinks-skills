# cloud-starter(服务间调用底座)

`com.mqttsnet.basic.cloud.*`。它给下游服务提供三件事:**HTTP 客户端连接池、上下文 header 透传、
灰度负载均衡**。四个自动配置在 `META-INF/spring/…AutoConfiguration.imports` 里声明:
`HttpClientPoolAutoConfiguration` / `RestTemplateConfiguration` / `HttpServiceAutoConfiguration` /
`GrayscaleConfig`。

## OpenFeign 已被移除(1.0.9)

1.0.9 起本 starter **不再提供 OpenFeign 装配**。删掉的是 `OpenFeignAutoConfiguration`、
`SentinelAutoConfiguration`、`LampSentinelInvocationHandler`、`SentinelFeignBuilder`、
`LampFeignClientsRegistrar`、`FeignAddHeaderRequestInterceptor`、`DateFormatRegister`
以及两个 Feign 日志类;取而代之的是 Spring 的 **HTTP Interface**(`RestClient` +
`@HttpExchange`)。

> **消费方版本不一致**:社区版组件仍锚在 1.0.8.x,那条线上 Feign 装配还在。
> 判断某个仓属于哪一边看它自己的 `.thinglinks-product.env` 的 `THINGLINKS_UTIL_VERSION`。
> 上层怎么写客户端接口见 [`thinglinks-cloud` / service-rpc](../../thinglinks-cloud/references/system/service-rpc.md)。

## HTTP Interface 装配

`HttpServiceAutoConfiguration` 在 classpath 有 `RestClient` + `RestClientHttpServiceGroupConfigurer`
时生效,做的事只有一件:**给所有 group 挂上 `HttpServiceHeaderInterceptor`**。

它不定义 group、不绑服务名 —— 那是消费方用 `@ImportHttpServices` 声明的。本 starter
只保证「无论哪个 group,上下文都会透传」。

两个 bean 都是 `@ConditionalOnMissingBean`,业务要换拦截器直接自己定义同名 bean 即可。

## header 透传规则

`HttpServiceHeaderInterceptor`(RestClient 侧)与 `RestTemplateHeaderInterceptor`(RestTemplate 侧)
行为一致:

1. **有 Servlet 上下文时优先透传当前请求头** —— `RequestContextHolder` 拿得到
   `ServletRequestAttributes` 就从原请求复制
2. **没有时回退到 `ContextUtil.getLocalMap()`** —— 异步线程、定时任务、MQ 消费这类场景

透传的是租户 / 用户 / 员工 / 公司 / 部门 / token / clientId / path / locale / trace /
灰度版本 / 租户库池名 / `X-Real-IP` / `x-forwarded-for` 这一组固定清单。

- **过滤空值,且写成单值 header** —— 迁移前会出现重复 trace 等多值头,现在不会
- 常量里还有 `ContextConstants.FEIGN = "x-feign"`,那只是遗留的 header 名,
  **不代表这条链路还在用 Feign**

要新增一个跨服务透传的字段,改的是这份清单;只在业务代码里 `set` 一个 header 不会被带过去。

## 连接池:LAX 策略下 `maxConnections` 不生效

Spring Boot 的 `spring.http.clients.*` 只覆盖连接超时、读超时、重定向和 SSL,
**连接池容量没有通用属性**,所以池参数走本 starter 的 `thinglinks.http-client.pool.*`
(`HttpClientPoolProperties`,底层 Apache HttpClient 5):

| 属性 | 默认 | 说明 |
| --- | --- | --- |
| `max-connections` | 500 | **仅 `concurrency-policy=STRICT` 时生效** |
| `max-connections-per-route` | 50 | HttpClient 5 自身默认只有 5 |
| `time-to-live` | 15s | 超过不再复用 |
| `connection-request-timeout` | 15s | 租借等待;HttpClient 5 自身默认 3 分钟,池满会长时间挂起 |
| `concurrency-policy` | `LAX` | LAX 用 LaxConnPool,**没有全局总量字段,只按路由限流** |
| `reuse-policy` | `LIFO` | |
| `evict-expired-connections` | true | 后台回收过期连接 |

⚠️ **默认 LAX 之下调 `max-connections` 是没有效果的**,真正起作用的是
`max-connections-per-route`。要让总量生效必须同时把 `concurrency-policy` 改成 `STRICT`。

连接存活时间是用 `withConnectionConfigCustomizer` 叠加上去的,**不能改用
`setDefaultConnectionConfig`** —— 那会整体覆盖 `spring.http.clients.*` 写入的超时。

## RestTemplate 两个 bean,只有一个透传上下文

`RestTemplateConfiguration` 同时给出:

| bean | 特点 | header 透传 |
| --- | --- | --- |
| `lbRestTemplate` | `@LoadBalanced`,按 Nacos 服务名调用 | **有**(`RestTemplateHeaderInterceptor`) |
| `restTemplate` | 普通的,调外部固定地址 | **没有** |

⚠️ **拿 `restTemplate` 调内部服务,租户与用户上下文不会带过去** —— 下游按 header 重建上下文,
拿不到就会切到默认库或当成匿名。症状是「查出来的数据不对」而不是报错。
调内部服务一律用 `lbRestTemplate`,或者自己把拦截器加上。

注入时按 bean 名区分,别只按类型注入 —— 两个同类型 bean,按类型注入会歧义或拿到不带拦截器的那个。

两个 bean 都还带着 `@SentinelRestTemplate`:**被移除的是 Feign 侧的 Sentinel 适配**
(`SentinelAutoConfiguration` / `LampSentinelInvocationHandler` / `SentinelFeignBuilder`),
RestTemplate 这条路上的 Sentinel 注解仍在。

## 灰度

`GrayscaleConfig` 默认开启(`thinglinks.grayscale.enabled`,`matchIfMissing = true`),
通过 `@LoadBalancerClients(defaultConfiguration = GrayscaleLbConfig.class)` 把默认负载均衡器
换成 `GrayscaleVersionRoundRobinLoadBalancer`,按透传过来的灰度版本 header 选实例。

它作用在**负载均衡这一层**,所以 `lbRestTemplate` 与 HTTP Interface 的服务发现调用都受影响;
直连固定地址的调用不走它。
