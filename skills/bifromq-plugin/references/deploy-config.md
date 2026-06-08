# 构建 + 配置 + 部署进 BifroMQ

## 构建

```bash
mvn clean package -DskipTests   # 生成 4 个 *.zip 插件包(auth / event / setting / resource)
```

## 配置(各插件 `*/conf/config.yaml`)

**Auth**(`authProviderConfig`):
```yaml
authProviderConfig:
  auth:
    baseUrl: http://127.0.0.1:18760
    clientAuthEndpoint: /link/anyTenant/deviceOpen/clientConnectionAuthentication
  acl:
    enabled: false                 # 开 ACL 鉴权
    aclCheckEndpoint: /link/anyTenant/deviceOpen/clientAclValidation
    tenantWhitelist: []
    cache: { maxSize: 2000000, expireMinutes: 10, refreshAfterWrite: 2 }
```
**Event**(`eventProviderConfig.kafka`):`bootstrapServers`、`producer.acks=1`、`compressionType=lz4`、`batchSize=131072`、`lingerMs=20`、`bufferMemory=268435456`。

## 部署进 BifroMQ

1. 解压 4 个 zip 到 BifroMQ `plugins/` 目录;
2. `standalone.yml` 配置 FQN:
   ```yaml
   authProviderFQN: com.mqttsnet.thinglinks.BifromqAuthProviderPluginAuthProvider
   settingProviderFQN: com.mqttsnet.thinglinks.BifromqSettingProviderPluginSettingProvider
   resourceThrottlerFQN: com.mqttsnet.thinglinks.BifromqResourceThrottlerPluginResourceThrottlerProvider
   # event-collector 同理按 BifroMQ 的 eventCollector 配置项接入
   ```
3. ⚠️ `bin/bifromq-start.sh` 启动参数**加 `-Dsetting_provide_init_value=true`**(否则 setting 失效 + 心跳采集不到);
4. 重启 BifroMQ。

## 版本

BifroMQ **3.3.5**(`com.baidu.bifromq.*`)。升 4.0 需全局把包名换成 `org.apache.bifromq.*`(各插件 README 有 3.3.5→4.0 差异表)。

## 文档

仓库根 `README.md` / `README.zh-CN.md` + 各插件 `*/README.md`(event 插件 README 重点讲 `PING_REQ` 前置条件与 processor 包结构)。
