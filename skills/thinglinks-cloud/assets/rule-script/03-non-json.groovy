/*
 * 非 JSON 报文骨架(十六进制 / 文本)
 * originBodyHex 有值用 hex(二进制无损),否则按文本字节。注意越界守卫。
 */
import com.alibaba.fastjson2.JSON
import com.mqttsnet.basic.utils.SnowflakeIdUtil
import cn.hutool.core.util.HexUtil

def deviceId = deviceIdentification ?: device?.deviceIdentification
def ts = System.currentTimeMillis()
log.info("originBodyHex=" + originBodyHex + " originBody=" + originBody)

// 十六进制优先;否则文本 UTF-8 字节
def bytes = originBodyHex ? HexUtil.decodeHex(originBodyHex) : (originBody ?: "").getBytes("UTF-8")
def data = [
    battery   : bytes.length > 0 ? (bytes[0] & 0xFF) : null,    // 第 1 字节
    brightness: bytes.length > 1 ? (bytes[1] & 0xFF) : null     // 第 2 字节
].findAll { k, v -> v != null }

// 文本分隔示例(如 "25.6,60"):
// def parts = (originBody ?: "").split(","); def t = parts[0] as BigDecimal

def payload = [
    head    : [mid: SnowflakeIdUtil.nextLong(), cipherFlag: 0, timeStamp: ts],
    dataBody: [devices: [[deviceId: deviceId, services: [[
        serviceCode: config?.SERVICE_CODE ?: "default_attributes_controls",
        data       : data, eventTime: ts
    ]]]]],
    dataSign: ""
]
return [topic: "/v1/devices/" + deviceId + "/datas", payload: JSON.toJSONString(payload)]
