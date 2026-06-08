/*
 * 多服务 + config(extend_params)骨架
 * 一条报文同时上报多个服务;阈值/系数走 config,改配置不动脚本。
 * 建议 config:{ "LOW_BATTERY_THRESHOLD": 20, "TEMP_RATIO": 0.1 }
 */
import com.alibaba.fastjson2.JSON
import com.mqttsnet.basic.utils.SnowflakeIdUtil
import java.text.SimpleDateFormat

def raw = JSON.parseObject(originBody)
def deviceId = deviceIdentification ?: device?.deviceIdentification
def ts = System.currentTimeMillis()
def nowStr = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(ts))   // DateTime 属性用,勿用 Date.format
def lowThreshold = (config?.LOW_BATTERY_THRESHOLD ?: 20) as int
def tempRatio    = (config?.TEMP_RATIO ?: 0.1) as BigDecimal
def clean = { Map m -> m.findAll { k, v -> v != null } }
log.info("raw=" + raw)

def svcAttr = [serviceCode: "default_attributes_controls", eventTime: ts, data: clean([
    battery   : raw.getInteger("bat"),
    charging  : raw.containsKey("chg") ? raw.getInteger("chg") == 1 : null,
    brightness: raw.getInteger("bri"),
    play_mode : raw.getString("mode"),
    last_heartbeat_time: nowStr
])]
def bat = raw.getInteger("bat"); def temp = raw.getInteger("temp")
def svcBatt = [serviceCode: "default_battery_monitoring", eventTime: ts, data: clean([
    battery_level      : bat,
    battery_temperature: temp == null ? null : (temp * tempRatio),
    low_battery_alert  : bat == null ? null : (bat < lowThreshold),
    battery_report_time: nowStr
])]

// 丢掉空服务
def services = [svcAttr, svcBatt].findAll { it.data && !it.data.isEmpty() }
log.info("services=" + services*.serviceCode)

def payload = [
    head    : [mid: SnowflakeIdUtil.nextLong(), cipherFlag: 0, timeStamp: ts],
    dataBody: [devices: [[deviceId: deviceId, services: services]]],
    dataSign: ""
]
return [topic: "/v1/devices/" + deviceId + "/datas", payload: JSON.toJSONString(payload)]
