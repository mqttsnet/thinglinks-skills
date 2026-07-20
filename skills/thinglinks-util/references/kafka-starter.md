# kafka-starter(生产/消费通用装配)

`com.mqttsnet.basic.kafka.*`。装配条件:`@EnableKafkaStarter` + classpath 有 spring-kafka + 配了 `spring.kafka.bootstrap-servers`。所有 bean `@ConditionalOnMissingBean`,业务可覆盖。

## 生产侧 bean

| Bean | 作用 |
| --- | --- |
| `thingLinksKafkaTemplate`(KafkaTemplate) | 自动 attach 发送回调;`setAllowNonTransactional(true)`——即便工厂配了事务前缀,事务外普通 send 也按非事务发送,不会抛 `No transaction is in process` |
| `KafkaProducerService` | 业务统一入口,两个重载(见下) |
| `KafkaSendResultHandler`(ProducerListener) | 成功 **debug**(防高 TPS 日志洪峰)/ 失败 error 全栈 |
| `KafkaTransactionManager` | **仅当**配了 `spring.kafka.producer.transaction-id-prefix` 才装配 |

## 发送规范(硬规则)

```java
// 无序场景(粘性分区随机落盘)
kafkaProducerService.thingLinksKafkaTemplateSendMsg(topic, msg);
// 按实体保序:同 key 同分区。设备消息一律用 clientId / deviceIdentification 作 key
kafkaProducerService.thingLinksKafkaTemplateSendMsg(topic, key, msg);
```

- 返回 `CompletableFuture<SendResult>`;**主链路禁止 `.get()/join()`** 同步等待(等于把异步发送变同步阻塞)。
- 投递语义 = **at-most-once 旁路**(失败仅回调记日志);要不丢需业务自建 outbox/重投。
- 旁路失败不得阻断主路:producer 配 `properties.max.block.ms`(基线 3000)——buffer 满/集群不可用时 send() 默认阻塞 60s,会拖死上行线程。

## 事务策略(防回潮)

事务是 **opt-in**:配 `transaction-id-prefix` 才开。开了的代价 = 强制 `acks=all` + `max.in.flight≤5` + 每次 send 走事务协调器,吞吐大降;事件投递场景**不要配**。

## 生产参数基线(nacos kafka.yml)

`acks=1`(at-least-once 足够,幂等随之关闭)· `retries=5` · `compression=lz4` · `batch-size=64K` · `linger-ms=20` · `max.in.flight=16` · `max.block.ms=3000`。
⚠️ 该组合下重试存在**乱序窗口**;按设备保序依赖"带 key + 分区内"语义,跨重试严格序需 `in.flight=1`(吞吐换序,默认不做)。

## 消费侧

`KafkaConsumerAutoConfiguration`:并发/AckMode 取 `spring.kafka.listener.*`(基线 `concurrency=16`、`manual_immediate`、批量监听);`DefaultErrorHandler + DeadLetterPublishingRecoverer + ExponentialBackOff`(DLT 重试死信);`KafkaListenerLoggingErrorHandler` 统一日志。
