#!/usr/bin/env node
/**
 * Validate ThingLinks skills — frontmatter + References Index integrity.
 *
 * Checks, per skill under `skills/<name>/`:
 *   1. SKILL.md has frontmatter with `name` (matching the dir) and a non-trivial `description` (the trigger).
 *   2. Every `references/<x>.md` linked from SKILL.md actually exists (no dangling links).
 *   3. Every file in `references/` is linked from SKILL.md (no orphan references).
 *   4. Optional `lint.json` purity rules hold — declared per skill, e.g. reference
 *      directories that must not leak implementation details (class names, SQL, module paths).
 *   5. Every relative markdown link (`](../x.md)`) resolves — catches cross-skill links that
 *      rot when a file moves.
 *   6. Bare `references/<x>.md` paths written in prose resolve too. The References Index check
 *      above only sees markdown-link form, so reorganising `references/` into subdirectories
 *      used to leave these silently pointing at nothing.
 *   7. Workflow front-matter `requires: [tool, ...]` names appear somewhere under
 *      `references/orchestration/` — a typo there means the workflow declares a dependency on
 *      a tool the routing layer never mentions.
 *
 * Zero external dependencies — run with `node scripts/validate.mjs`.
 * Exit code 0 = all valid, 1 = problems found (used by CI).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(ROOT, 'skills');

let errors = 0;
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  errors++;
};
const pass = (msg) => console.log(`  ✓ ${msg}`);

/** Minimal YAML frontmatter parser — supports `key: value` and folded `key: >` blocks. */
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  const lines = m[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const km = lines[i].match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!km) continue;
    let val = km[2];
    if (val === '>' || val === '|') {
      const buf = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) buf.push(lines[++i].trim());
      val = buf.join(' ');
    }
    fm[km[1]] = val;
  }
  return fm;
}

if (!existsSync(SKILLS_DIR)) {
  console.error('No skills/ directory found.');
  process.exit(1);
}

const skills = readdirSync(SKILLS_DIR).filter((d) => statSync(join(SKILLS_DIR, d)).isDirectory());
if (!skills.length) fail('no skills found under skills/');

for (const name of skills) {
  console.log(`\n[${name}]`);
  const dir = join(SKILLS_DIR, name);
  const skillPath = join(dir, 'SKILL.md');
  if (!existsSync(skillPath)) {
    fail(`${name}: missing SKILL.md`);
    continue;
  }
  const text = readFileSync(skillPath, 'utf8');

  // 1) frontmatter
  const fm = parseFrontmatter(text);
  if (!fm) {
    fail(`${name}: SKILL.md has no frontmatter (--- ... ---)`);
  } else {
    if (!fm.name) fail(`${name}: frontmatter missing 'name'`);
    else if (fm.name !== name) fail(`${name}: frontmatter name '${fm.name}' != directory '${name}'`);
    if (!fm.description || fm.description.length < 40)
      fail(`${name}: frontmatter 'description' missing or too short — it is the auto-trigger`);
    if (fm.name === name && (fm.description || '').length >= 40) pass('frontmatter (name + trigger description)');
  }

  // 2) References Index links resolve (supports domain subdirs, e.g. references/iot/x.md)
  const linked = new Set();
  for (const m of text.matchAll(/\(references\/([a-zA-Z0-9_/-]+\.md)\)/g)) {
    linked.add(m[1]);
    if (!existsSync(join(dir, 'references', m[1])))
      fail(`${name}: SKILL.md links references/${m[1]} but the file is missing (dangling link)`);
  }
  if (linked.size) pass(`${linked.size} reference link(s) resolve`);

  // 3) no orphan reference files (recurse into domain subdirs)
  const refDir = join(dir, 'references');
  if (existsSync(refDir)) {
    const walk = (d, prefix = '') => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) walk(join(d, e.name), rel);
        else if (e.name.endsWith('.md') && !linked.has(rel))
          fail(`${name}: references/${rel} exists but is not linked from SKILL.md (orphan)`);
      }
    };
    walk(refDir);
  }

  // 4) optional purity rules — a skill may declare directories that must stay free of
  //    implementation detail (see lint.json). Nothing to do when the file is absent.
  const lintPath = join(dir, 'lint.json');
  if (existsSync(lintPath)) {
    let lint;
    try {
      lint = JSON.parse(readFileSync(lintPath, 'utf8'));
    } catch (e) {
      fail(`${name}: lint.json is not valid JSON — ${e.message}`);
      lint = null;
    }
    for (const rule of lint?.purity ?? []) {
      const patterns = (rule.forbid ?? []).map((p) => new RegExp(p));
      let violations = 0;
      for (const rel of rule.paths ?? []) {
        const base = join(dir, rel);
        if (!existsSync(base)) {
          fail(`${name}: lint.json purity path ${rel} does not exist`);
          continue;
        }
        const scan = (d) => {
          for (const e of readdirSync(d, { withFileTypes: true })) {
            const p = join(d, e.name);
            if (e.isDirectory()) {
              scan(p);
              continue;
            }
            if (!e.name.endsWith('.md')) continue;
            const lines = readFileSync(p, 'utf8').split('\n');
            lines.forEach((line, i) => {
              const hit = patterns.find((re) => re.test(line));
              if (hit)
                fail(
                  `${name}: ${p.slice(dir.length + 1)}:${i + 1} matches forbidden ${hit} — ${rule.reason ?? 'purity rule'}`
                );
              if (hit) violations++;
            });
          }
        };
        scan(base);
      }
      if (!violations) pass(`purity: ${(rule.paths ?? []).join(', ')}`);
    }
  }

  // collect every markdown file in the skill once — checks 5-7 all walk it
  const mdFiles = [];
  const collect = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) collect(p);
      else if (e.name.endsWith('.md')) mdFiles.push(p);
    }
  };
  collect(dir);

  // 5) relative markdown links resolve (strip any #anchor before testing)
  let relChecked = 0;
  let relBad = 0;
  for (const file of mdFiles) {
    const body = readFileSync(file, 'utf8');
    for (const m of body.matchAll(/\]\((\.\.?\/[^)\s]+)\)/g)) {
      relChecked++;
      const target = join(dirname(file), m[1].split('#')[0]);
      if (!existsSync(target)) {
        fail(`${name}: ${file.slice(dir.length + 1)} links ${m[1]} but it does not exist`);
        relBad++;
      }
    }
  }
  if (relChecked && !relBad) pass(`${relChecked} relative link(s) resolve`);

  // 6) bare `references/<x>.md` paths in prose resolve (skip cross-skill `../<skill>/references/...`)
  let bareBad = 0;
  for (const file of mdFiles) {
    const body = readFileSync(file, 'utf8');
    for (const m of body.matchAll(/(^|[^/\w.-])references\/([a-zA-Z0-9_/-]+\.md)/g)) {
      if (!existsSync(join(dir, 'references', m[2]))) {
        fail(
          `${name}: ${file.slice(dir.length + 1)} mentions references/${m[2]} but that file does not exist ` +
            `(left over from a references/ reorg?)`
        );
        bareBad++;
      }
    }
  }
  if (!bareBad) pass('bare references/ paths resolve');

  // 7) workflow `requires:` names are known to the orchestration layer
  const orchDir = join(refDir, 'orchestration');
  if (existsSync(orchDir)) {
    const orchText = mdFiles
      .filter((f) => f.startsWith(orchDir))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const declared = new Set();
    let reqBad = 0;
    // only real workflow pages — assets/ holds a skeleton whose `requires` are placeholders
    const workflowDir = join(refDir, 'workflows');
    for (const file of mdFiles.filter((f) => f.startsWith(workflowDir))) {
      const fm = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
      const req = fm?.[1].match(/^requires:\s*\[(.*)\]\s*$/m);
      if (!req) continue;
      for (const raw of req[1].split(',')) {
        const tool = raw.trim();
        if (!tool) continue;
        declared.add(tool);
        if (!orchText.includes(`\`${tool}\``)) {
          fail(
            `${name}: ${file.slice(dir.length + 1)} requires '${tool}' but no orchestration/ file mentions it`
          );
          reqBad++;
        }
      }
    }
    if (declared.size && !reqBad) pass(`${declared.size} required tool name(s) known to orchestration/`);
  }
}

console.log(`\n${errors ? `❌ ${errors} problem(s) found` : '✅ all skills valid'}`);
process.exit(errors ? 1 : 0);
