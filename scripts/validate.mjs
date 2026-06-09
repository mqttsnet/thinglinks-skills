#!/usr/bin/env node
/**
 * Validate ThingLinks skills — frontmatter + References Index integrity.
 *
 * Checks, per skill under `skills/<name>/`:
 *   1. SKILL.md has frontmatter with `name` (matching the dir) and a non-trivial `description` (the trigger).
 *   2. Every `references/<x>.md` linked from SKILL.md actually exists (no dangling links).
 *   3. Every file in `references/` is linked from SKILL.md (no orphan references).
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
}

console.log(`\n${errors ? `❌ ${errors} problem(s) found` : '✅ all skills valid'}`);
process.exit(errors ? 1 : 0);
