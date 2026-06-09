# Roadmap

ThingLinks skills currently cover the four core repositories (**one skill = one repo**). The table below tracks possible additions. Principle: **a skill is added only once its underlying module is stable enough to document against real code** — we don't ship empty shells.

## Now (shipped)

| Skill | Repository |
| --- | --- |
| `thinglinks-cloud` | cloud business platform — `broker` / `mqs` / `rule` / `link` / `public` |
| `thinglinks-util` | framework foundation — `protocol-starter` / `groovy-engine-starter` / `thinglinks-core` |
| `thinglinks-web` | frontend console — Vue3 + Vben |
| `bifromq-plugin` | BifroMQ broker plugins — `bifromq-plugin-pro` |

## Candidates (not started)

| Candidate | Scope | Status |
| --- | --- | --- |
| Rule engine — linkage & scene | `iot/rule/engine/linkage`, scene-action, alarm rules (beyond Groovy scripts, which `thinglinks-cloud` already covers) | watching |
| North-bound integration | data bridge / MQTT subscription source / protocol transcoding (`iot/rule/integration`) | watching |
| Video / streaming | `views/video` + media backend | future |
| AI | device-side / platform AI features | future |
| SCADA | SCADA module | future |

These may also land as **new `references/*.md` inside an existing skill** rather than a whole new skill, when the scope is narrow.

## Continuous

- **Freshness** — keep each `SKILL.md` `📌 最后核对` footer current; log content updates in [`CHANGELOG.md`](./CHANGELOG.md).
- **CI** — [`scripts/validate.mjs`](./scripts/validate.mjs) guards frontmatter + References Index integrity on every PR.

Want a module covered? Open an issue (see [`.github/ISSUE_TEMPLATE`](./.github/ISSUE_TEMPLATE/)).
