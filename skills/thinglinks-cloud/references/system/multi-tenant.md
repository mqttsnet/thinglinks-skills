# 多租户模型(本分支:DATASOURCE_COLUMN)

由一个属性决定:**`thinglinks.database.multiTenantType`** ∈ `{NONE, COLUMN, DATASOURCE, DATASOURCE_COLUMN}`(类型 `com.mqttsnet.basic.database.properties.MultiTenantType`,在 thinglinks-util)。本仓本分支 = **`DATASOURCE_COLUMN`**(`docs/config/nacos/DEFAULT_GROUP/database.yml`),即**两套机制同时生效**:

## 1. 动态数据源(每租户一库)

baomidou `dynamic-datasource`。请求头带租户 → `HeaderThreadLocalInterceptor`(`thinglinks-sa-token-ext`)塞进 `ContextUtil`(ThreadLocal)→ SQL 前 `DsThreadProcessor` 读 `ContextUtil` 解析池名 `"{prefix}_{tenantId}"`。每租户库由 `tenant/service/DataSourceService` + `InitDatabaseOnStarted.createDatabase(tenantId)` 建(前缀 `thinglinks_base` / `thinglinks_extend`)。

> **建库 DDL 须放行拦截器**:`InitDatabaseMapper`(`thinglinks-tenant-datasource-init`)+ `TDengineMapper`(`thinglinks-tds-biz`)都标 `@InterceptorIgnore(blockAttack="true", illegalSql="true", …)`。多方言建库/建超表 DDL(`CREATE DATABASE`/`CREATE USER`/`GRANT`/达梦·SQLServer 方言)映射成 `<update>/<delete>` 会被 `BlockAttackInnerInterceptor` 当 UPDATE/DELETE 用 JSqlParser 解析,而这些非标准 DDL 解析不了 → 不放行则新建租户建库失败。
>
> **租户库初始化 SQL**(`thinglinks-tenant-datasource-init/src/main/resources/schema/{mysql,dm}/thinglinks_base.sql`)随版本发布/OTA 新增列:`ota_upgrades.product_version_no`(目标产品版本号)、`product_publish_record.{canary_result_json(策略执行结果快照), retry_count, max_retry_count}`。字段语义见 `iot/product-version-publish.md` / `iot/ota.md`。

## 2. 列租户线(行内 tenant 列)

Mybatis-Plus 租户拦截器,**仅在 `DATASOURCE_COLUMN`/`COLUMN` 装配**(`MybatisAutoConfiguration.getPaginationBeforeInnerInterceptor`):`LampTenantLineInnerInterceptor`,**列名 `created_org_id`**、**值 = `ContextUtil.getCurrentCompanyId()`(组织/公司 id,非原始 tenantId)**,带 `ignoreTable`/`ignoreTablePrefix` 排除。

> 合起来:租户头 → ThreadLocal;`DsThreadProcessor` 切库 + 每条非排除查询自动加 `created_org_id = currentCompanyId`。纯 `COLUMN` 跳过切库(单库 + 列过滤);`NONE` 两者全关。行级数据权限(按组织树/角色)是正交层:`DataScopeInnerInterceptor`(`thinglinks-data-scope-sdk`,`thinglinks.database.isDataScope=true`)。

## Def* vs Base*(身份 vs 租户内投影)

- `DefUser`(thinglinks-**system**):**全局**登录身份。
- `BaseEmployee` / `BaseOrg`(thinglinks-**base**):该用户在**某租户内**的投影(员工/组织),经 `DefUserTenantRel` 关联。

## ⚠️ 反幻觉

- 本分支是 DATASOURCE_COLUMN —— **切库 + 列过滤都在**,别只考虑其一。
- 列租户值是 `created_org_id = currentCompanyId`(公司/组织 id),**不是** tenantId 本身。
- 租户上下文/拦截器在 `thinglinks-util`(`com.mqttsnet.basic.*`)+ `thinglinks-common-config`;核对真实代码。
