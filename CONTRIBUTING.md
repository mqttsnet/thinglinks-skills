# Contributing to ThingLinks Skills

Thanks for helping improve the ThingLinks agent skills! This repo packages **on-demand knowledge** for AI agents working on the [ThingLinks](https://github.com/mqttsnet/thinglinks) IoT platform. Quality here means one thing above all: **accuracy against real code**.

## Ground rules

1. **One skill = one repository.** Skill names map 1:1 to the platform's repos (`thinglinks-cloud`, `thinglinks-util`, `thinglinks-web`, `bifromq-plugin`) — no `-dev` suffix.
2. **Base everything on real code.** Don't write from memory or training data. Read `com.mqttsnet.thinglinks.*` / `com.mqttsnet.basic.*` (or the Vue source) and cite the class/file. For volatile field names, signatures and line numbers, prefer _"verify against `com.mqttsnet.thinglinks.*`"_ over hardcoding — and keep the `📌 最后核对` footer date current when you re-verify.
3. **Progressive disclosure.** `SKILL.md` is a lean index (architecture overview + anti-hallucination guardrails + References Index). Put detail in a focused `references/<subtopic>.md` and link it from the index. Don't bloat `SKILL.md`.
4. **The `description:` frontmatter is the trigger.** Keep it rich and scenario-specific (class names + domain terms like 规则脚本 / 设备上行下行 / 物模型) — it decides when the skill auto-loads.
5. **Assets are copy-paste starters.** Add runnable skeletons under `assets/` only where they save real time.

## Skill anatomy

```
skills/<name>/
├── SKILL.md            # index: overview + References Index + anti-hallucination + 最后核对 footer
├── references/*.md     # one subtopic per file, loaded on demand
├── assets/             # copy-paste starters (optional)
└── agents/openai.yaml  # cross-tool interface (Codex / OpenAI agents)
```

## Before you open a PR

Run the validator — CI runs the exact same check:

```bash
node scripts/validate.mjs
```

It verifies, per skill: frontmatter (`name` matches the directory + a non-trivial `description`), every References Index link resolves (no dangling links), and every `references/*.md` is linked from the index (no orphans).

Then:

- Add an entry under `[Unreleased]` in `CHANGELOG.md`.
- If your change tracks a code change, bump that skill's `📌 最后核对` footer date.

## Docs language

The `SKILL.md` frontmatter **`description` is written in English** — it is the trigger and is matched across agent tools. The **bodies and `references/*.md` are written in Chinese**, serving the primary ThingLinks developer audience. Keep that split; code identifiers stay verbatim in any language.

## License

By contributing you agree your work is licensed under [Apache-2.0](./LICENSE).
