# 自定义上行 TopicHandler

厂商按 datas 风格自建私有 topic + 走自己的 Java 处理链路。机制:`TopicHandlerFactory`(`thinglinks-mqs/.../uplink/handler/factory`)启动时 Spring 自动发现所有 `TopicHandler` Bean,按各自 `topicPattern()` **正则**匹配 topic,**首个命中即路由**;无匹配走 `DefaultHandler`。

## 接口契约

`com.mqttsnet.thinglinks.mqs.uplink.handler.TopicHandler`:
- `void handle(UplinkMessageEventSource source)` —— 业务逻辑。
- `String topicPattern()` —— 完整匹配的 topic 正则;返回 null/空表示不参与匹配(兜底用)。

`UplinkMessageEventSource`(`com.mqttsnet.thinglinks.entity.uplink.source`)getter:`getTopic()`、`getQos()`、`getPayloadBytes()`(byte[])、`getPayload()`、`getPayloadHex()`、`getDeviceCacheVO()`(上行链路已透传)。

## 接入 3 步(不改工厂)

1. `implements TopicHandler`(或继承 `AbstractMessageHandler` 复用 `resolveDeviceCache` / TD 子表结构缓存等);
2. `topicPattern()` 返回 `^...$` 正则;
3. `@Service` 声明 Bean → 自动注册。

## 示例(私有 topic → 复用 datas 落库:TDengine + 影子)

```java
package com.mqttsnet.thinglinks.mqs.uplink.handler;

import java.nio.charset.StandardCharsets;
import java.util.HashMap; import java.util.List; import java.util.Map;
import com.alibaba.fastjson2.JSON; import com.alibaba.fastjson2.JSONObject;
import com.mqttsnet.thinglinks.cache.helper.LinkCacheDataHelper;
import com.mqttsnet.thinglinks.cache.vo.device.DeviceCacheVO;
import com.mqttsnet.thinglinks.entity.uplink.source.UplinkMessageEventSource;
import com.mqttsnet.thinglinks.mqs.service.DeviceDataProcessingService;
import com.mqttsnet.thinglinks.protocol.vo.param.TopoDeviceDataReportParam;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j @Service @RequiredArgsConstructor
public class VendorReportHandlerExample implements TopicHandler {

    private final LinkCacheDataHelper linkCacheDataHelper;
    private final DeviceDataProcessingService deviceDataProcessingService;

    @Override public String topicPattern() { return "^/vendorx/devices/[^/]+/report$"; }

    @Override public void handle(UplinkMessageEventSource source) {
        String topic = source.getTopic();
        String raw = new String(source.getPayloadBytes(), StandardCharsets.UTF_8);
        String[] seg = topic.split("/");
        String deviceId = seg.length > 3 ? seg[3] : null;
        DeviceCacheVO device = source.getDeviceCacheVO() != null
            ? source.getDeviceCacheVO()
            : linkCacheDataHelper.getDeviceCacheVO(deviceId).orElse(null);
        if (device == null) { log.warn("设备未命中缓存,跳过 {}", deviceId); return; }
        try {
            JSONObject body = JSON.parseObject(raw);
            Map<String, Object> data = new HashMap<>();
            data.put("battery", body.getInteger("b"));
            data.put("brightness", body.getInteger("bri"));
            data.values().removeIf(v -> v == null);
            String std = JSON.toJSONString(Map.of("devices", List.of(Map.of(
                "deviceId", device.getDeviceIdentification(),
                "services", List.of(Map.of(
                    "serviceCode", "default_attributes_controls",
                    "data", data, "eventTime", System.currentTimeMillis()))))));
            TopoDeviceDataReportParam param = JSON.parseObject(std, TopoDeviceDataReportParam.class);
            deviceDataProcessingService.processDeviceDataReport(param);
        } catch (Exception e) {
            log.error("处理失败 deviceId={} err={}", deviceId, e.getMessage(), e); // 不外抛,避免阻断上行
        }
    }
}
```

## 要点

- `topicPattern()` 用 `^...$` 且**互不重叠**(首个命中即路由,顺序取决于 Bean 顺序);
- `handle()` 内 `try/catch` **不外抛**(与平台 handler 一致,异常即透传不阻断上行);
- 落库可复用 `processDeviceDataReport`(白嫖 TDengine + 影子,前提:该版本已发布、服务已启用),或走完全自定义存储;
- 加密信封参考 `DeviceDatasHandler` 调 `protocolMessageAdapter.decryptMessage` 解密后再解析。

## 与规则脚本的关系

上行先过规则脚本前置转换;**未命中转换则原样透传**到此按原 topic 正则匹配 → 老用户自定义 handler 零改动继续可用。**同一 topic 勿同时配「规则脚本 + 自定义 handler」**(转换会改写 topic 致 handler 不命中,二选一)。
