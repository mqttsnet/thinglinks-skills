# Changelog

Notable changes to the ThingLinks skills. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Skills are knowledge packs, so entries describe **what an agent now knows**, not application releases.

## [Unreleased]

### Added
- `scripts/validate.mjs`: optional per-skill `lint.json` purity rules — declared directories are scanned for forbidden patterns (CI-enforced). `thinglinks-ai` uses it to keep its runtime-served references free of class names, module paths and SQL.
- **`thinglinks-ai`** — new skill: how an agent should drive the ThingLinks MCP server. `orchestration/` (routing by question type, cross-tool chaining, one file per capability domain — identity / org / audit / device / metric / rule / ota / view), `boundaries/` (read-only, server-injected identity, tenant isolation holds but org-level filtering does not apply, and an explicit unanswerable list), `workflows/` (answering contract, evidence rules, and 7 scenario playbooks incl. threshold audit, anomaly cross-check and fault triage), `server/` (architecture, protocol contract, tool-development hard rules, downstream `/inner/mcp` conventions, client integration, build & test). Ships `scripts/check_tool_drift.py` to reconcile the documented tool set against a live `tools/list`.
- `thinglinks-cloud`: video domain expanded to 3 references — `video.md` rewritten as overview (module split / domain map / table & cache baseline), new `video/gb28181.md` (signaling pipeline + 38-event system + cascade + Gb2016/2022 adapters), new `video/media-access.md` (ZLM hook events, stream/record, ISUP, JT1078, VendorProtocolAdapter, ONVIF); `iot/testing.md` gains bridge-execution verification.
- `thinglinks-util`: new `references/kafka-starter.md` (keyed send rules, transaction opt-in policy, `max.block.ms` fast-fail, DLT consumer baseline) and `references/databridge-starter.md` (Sink/Source/Serializer SPI, ConnectorRegistry discovery, 19-sink/3-source matrix).
- `thinglinks-web`: `iot-pages.md` — dashboard (assetStats/assetmap), product `versionOverview`, device-shadow location corrected to `device/running/`.
- All four project skills now carry a dual-line applicability note (Enterprise repo ↔ Community monorepo sub-dir) pointing to `thinglinks-workspace`; verified-against footers refreshed to 2026-06-12.
- **`thinglinks-workspace`** — new skill: dual-line repo/path locator (Community monorepo ↔ Enterprise repos), governance-file placement, version lines + `bump-version.sh`, `changelogs/` per-release layout, Nacos template placeholder rules, plus `references/security-baseline.md` (7-group hard-requirements checklist).
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
