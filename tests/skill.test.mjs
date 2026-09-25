import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SKILL = '.agents/skills/slides';
const read = (file) => readFileSync(join(SKILL, file), 'utf8');
const ownDocs = ['SKILL.md', 'reveal-template.md', 'design-to-reveal.md', 'animation-patterns.md', 'STYLE_PRESETS.md', 'bold-template-pack/README.md'];

test('has agent-agnostic frontmatter', () => {
  const skill = read('SKILL.md');
  assert.match(skill, /^---\nname: slides\ndescription: .+\n---\n/);
});

test('every relative link in the skill docs resolves', () => {
  for (const doc of ownDocs) {
    const links = [...read(doc).matchAll(/\]\(([^)#\s]+)\)/g)].map((m) => m[1]).filter((l) => !/^[a-z]+:/.test(l));
    for (const link of links) {
      const fromSkill = join(SKILL, dirname(doc), link);
      const fromRepo = link.replace(/^\/+/, '');
      assert.ok(existsSync(fromSkill) || existsSync(fromRepo), `${doc} links to missing ${link}`);
    }
  }
});

test('every selection-index entry points at existing cards', () => {
  const index = JSON.parse(read('bold-template-pack/selection-index.json'));
  assert.equal(index.templates.length, 34);
  for (const t of index.templates) {
    assert.ok(existsSync(join(SKILL, t.preview_md)), t.preview_md);
    assert.ok(existsSync(join(SKILL, t.design_md)), t.design_md);
  }
});

test('drops the single-HTML runtime', () => {
  assert.ok(!existsSync(join(SKILL, 'bold-template-pack/deck-stage.js')));
  for (const doc of ownDocs) {
    const text = read(doc);
    assert.doesNotMatch(text, /self-contained HTML|viewport-base\.css|html-template\.md/i, doc);
  }
});

test('never uses .reveal as an animation class', () => {
  for (const doc of ['SKILL.md', 'reveal-template.md', 'animation-patterns.md', 'design-to-reveal.md']) {
    assert.doesNotMatch(read(doc), /class="reveal[ "]|\.reveal-(scale|left|blur)\b|^\.reveal \{/m, doc);
  }
});

test('the skill does not ask the user questions', () => {
  assert.doesNotMatch(read('SKILL.md'), /AskUserQuestion|ask the user|ask \(header/i);
});

test('keeps the frontend-slides licence', () => {
  assert.match(read('LICENSE-frontend-slides'), /MIT License[\s\S]*Zara Zhang/);
});

test('AGENTS.md points builders at the skill', () => {
  assert.match(readFileSync('AGENTS.md', 'utf8'), /\.agents\/skills\/slides\/SKILL\.md/);
});

test('templates directory has 34 packs with both cards', () => {
  const dirs = readdirSync(join(SKILL, 'bold-template-pack/templates'));
  assert.equal(dirs.length, 34);
});
