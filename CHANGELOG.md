# Changelog

Notable changes to the ThingLinks skills. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Skills are knowledge packs, so entries describe **what an agent now knows**, not application releases.

## [Unreleased]

### Added
- `thinglinks-cloud`: `references/ws-downlink-broadcast.md` — WS downlink broadcast (`WsDeviceSessionRegistry` online registry + RocketMQ `BROADCASTING` fan-out + local-first delivery + heartbeat / TTL self-heal), replacing the old `SessionOwnerRegistry` point-to-point (`ip:port`) routing.
- `thinglinks-util`: `HybridLogicalClockUtil` (HLC) section in `references/core-utils.md` — causal-ordering key (`physicalMs << 16 | counter`), strictly monotonic, **not** a timestamp.
- `scripts/validate.mjs` + `.github/workflows/skill-lint.yml` — CI validation of frontmatter + References Index integrity.
- `📌 最后核对` (verified-against) footers on all four `SKILL.md`.
- `CONTRIBUTING.md`, `CHANGELOG.md`, Japanese & Korean READMEs, GitHub issue / PR templates.
- `thinglinks-cloud`: **system-foundation** references (`system/architecture` boot/cloud Facade duality, `system/gateway` WebFlux + Sa-Token, `system/auth` Sa-Token login/token, `system/multi-tenant` DATASOURCE_COLUMN) + a **video** reference (`video/video` GB28181 + ZLMediaKit) — all real-code-grounded.
- `thinglinks-cloud`: IoT **test/access** references — `iot/device-access.md` (connect auth `clientConnectionAuthentication`, ACL `clientAclValidation`, clientId/credential derivation, WS/MQTT uplink frame, full topic→handler map) + `iot/testing.md` (downlink `sendMqttCustomMessage`/`dispatch`/`issueCommands`, script `transformDebug`, shadow/TDengine/command-record verification, end-to-end flow) — real endpoints + payloads for simulation & testing.

### Changed
- `thinglinks-cloud`: downlink chain rewritten around **`DeviceDownlinkFacade`** (protocol-agnostic `dispatch(DownlinkCommand)`; boot = in-process / cloud = Feign `thinglinks-broker-server`) → `DeviceDownlinkDispatchService` → `MqttDownlinkSender` / `WebSocketDownlinkSender` / `TcpDownlinkSender`. Corrected a wrong premise: there was **no** old broker-api `@Component` downlink dispatcher — protocol branching used to be inlined in callers and is now centralized.
- `thinglinks-web`: documented the WS/MQTT debug pages' `IotProductPicker` + `IotDevicePicker` "按设备" usage and the `<a-radio-group :options option-type="button">` segmented-toggle convention.
- `thinglinks-cloud`: **references reorganized by application domain** into `references/{system,iot,video}/`; `SKILL.md` reframed from IoT-only to the full cloud platform (system foundation + IoT + video), trigger description broadened. `scripts/validate.mjs` now walks nested reference subdirs.

## [0.1.0] — 2026-06-08

### Added
- Initial four skills: `thinglinks-cloud` (12 references + 3 Groovy rule-script skeletons), `thinglinks-util` (3 references), `thinglinks-web` (7 references), `bifromq-plugin` (4 references).
- Community-grade README (English + 简体中文), Apache-2.0 license, `.gitignore`.
