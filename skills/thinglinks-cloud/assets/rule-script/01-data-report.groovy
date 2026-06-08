/*
 * 单服务 · JSON 改名上报(最常用骨架)
 * 厂商 JSON 报文 → 平台标准 ThingLinks 信封。复制后按物模型改 serviceCode / data 键。
 */
import com.alibaba.fastjson2.JSON
import com.mqttsnet.basic.utils.SnowflakeIdUtil

def raw = JSON.parseObject(originBody)                       // 解析原始报文
def deviceId = deviceIdentification ?: device?.deviceIdentification
def ts = System.currentTimeMillis()
log.info("raw=" + raw)

// 物模型属性映射(键 = propertyCode);containsKey 区分"未上报"与"0";只保留有值
def data = [
    battery   : raw.getInteger("b"),
    charging  : raw.containsKey("chg") ? raw.getInteger("chg") == 1 : null,
    brightness: raw.getInteger("bri"),
    play_mode : raw.getString("mode")
].findAll { k, v -> v != null }

def payload = [
    head    : [mid: SnowflakeIdUtil.nextLong(), cipherFlag: 0, timeStamp: ts],
    dataBody: [devices: [[deviceId: deviceId, services: [[
        serviceCode: config?.SERVICE_CODE ?: "default_attributes_controls",
        data       : data, eventTime: ts
    ]]]]],
    dataSign: ""
]
// payload 必须 JSON.toJSONString(否则 Long 被序列化成 String → 下游强转报错)
return [topic: "/v1/devices/" + deviceId + "/datas", payload: JSON.toJSONString(payload)]
