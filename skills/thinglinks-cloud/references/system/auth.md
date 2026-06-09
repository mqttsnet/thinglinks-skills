# 认证授权(thinglinks-oauth · Sa-Token)

用 **Sa-Token**(非 Spring Security OAuth2、非裸 JWT)。令牌**不透明、Redis 存储**(`sa-token-redis-jackson`),**在网关统一校验**(`AuthenticationSaInterceptor`),下游服务信任网关注入的 header、不复验。

## 登录入口

`oauth-controller/RootController`:`POST /anyTenant/login` → `tokenGranterBuilder.getGranter(grantType).login(login)`;另有 `/anyTenant/refresh`、`/anyUser/logout`。

## 授权类型(`GrantType`)

`CAPTCHA` / `PASSWORD` / `MOBILE`(短信)/ `REFRESH_TOKEN`。**无 social、无 client_credentials**。策略 map 选 granter(`granterPool.get(grantType.name())`,每个 `@Component("PASSWORD"|"MOBILE"|…)`)。

## 登录流程(`AbstractTokenGranter.login`)

checkParam → checkClient(Basic `clientId:secret`,从 `Authorization`/`CLIENT_KEY` 头 Base64 取,查 `DefClientService`)→ checkCaptcha → 解析 `DefUser`(密码模式按 email/idCard/mobile/username 任一)→ 解析员工+租户(`DefUserTenantRel`)→ checkPassword → checkState → 解析组织(公司/部门/顶级公司)→ `buildResult`。

## 令牌签发(`buildResult`)

`StpUtil.login(userId,"PC")`;把 topCompany/company/dept/employee id 放进 `StpUtil.getTokenSession()`;返回 `token=StpUtil.getTokenValue()`、`expire`、`refreshToken=SaTempUtil.createToken(...)`。
- 权限来源:网关 `StpInterfaceServiceImpl implements StpInterface` → `oauth.biz.StpInterfaceBiz.getPermissionList/getRoleList`。
- 免登录切租户/组织:`AbstractTokenGranter.switchTenantAndOrg(tenantId, orgId)`。

## ⚠️ 反幻觉

- Sa-Token 不透明令牌 + Redis,**不是 JWT**;别去解 token 取 claims,信息在网关注入的 header / token session。
- 校验只在网关一处;下游读 header(`ContextUtil` / `HeaderThreadLocalInterceptor`),别在业务服务里再 `checkLogin`。
- 类名/行号随版本演进,核对真实代码 `com.mqttsnet.thinglinks.oauth.*`。
