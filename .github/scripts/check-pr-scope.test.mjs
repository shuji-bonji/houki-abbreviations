import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkScope, kindOf, onlyIdsAdded, parseNameStatus } from './check-pr-scope.mjs';

const APPROVED_PROPOSAL = '# 差分\n\n- 承認日: 2026-09-25（PR #60）\n- 実装の変更: 要\n';
const APPROVED_SPEC = '# 機能\n\n- 承認日: 2026-09-25（PR #60）\n';

function run(kind, changes, files = {}, diffs = {}) {
  return checkScope({
    kind,
    changes,
    read: (p) => files[p] ?? '',
    diffOf: (p) => diffs[p] ?? '',
  });
}

test('ブランチ名の接頭辞で種類が決まる', () => {
  assert.equal(kindOf('spec/20260925-live-scope'), 'spec');
  assert.equal(kindOf('spec-init/lookup-by-law-id'), 'spec-init');
  assert.equal(kindOf('fix/54-live-scope'), 'impl');
});

test('name-status の rename を from / path に分ける', () => {
  assert.deepEqual(parseNameStatus('M\tsrc/a.ts\nR100\tspecs/changes/x/spec.md\tspecs/releases/v1/x/spec.md\n'), [
    { status: 'M', path: 'src/a.ts' },
    { status: 'R', from: 'specs/changes/x/spec.md', path: 'specs/releases/v1/x/spec.md' },
  ]);
});

test('仕様 PR: specs/changes だけで承認日と PR 番号があれば通る', () => {
  const p = 'specs/changes/20260925-x/proposal.md';
  const errors = run('spec', [{ status: 'A', path: p }, { status: 'A', path: 'specs/changes/20260925-x/spec.md' }], {
    [p]: APPROVED_PROPOSAL,
  });
  assert.deepEqual(errors, []);
});

test('仕様 PR: src/ を変えると止まる', () => {
  const p = 'specs/changes/20260925-x/proposal.md';
  const errors = run('spec', [{ status: 'A', path: p }, { status: 'M', path: 'src/lookup.ts' }], {
    [p]: APPROVED_PROPOSAL,
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /src\/lookup\.ts/);
});

test('仕様 PR: 承認日が空欄なら止まる', () => {
  const p = 'specs/changes/20260925-x/proposal.md';
  const errors = run('spec', [{ status: 'A', path: p }], { [p]: '# 差分\n\n- 承認日: \n' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /承認日と PR 番号/);
});

test('仕様 PR: 承認日に PR 番号が無ければ止まる', () => {
  const p = 'specs/changes/20260925-x/proposal.md';
  const errors = run('spec', [{ status: 'A', path: p }], { [p]: '- 承認日: 2026-09-25\n' });
  assert.equal(errors.length, 1);
});

test('仕様 PR: 「実装の変更: 不要」なら specs/current も書いてよい（承認日は要る）', () => {
  const p = 'specs/changes/20260925-x/proposal.md';
  const cur = 'specs/current/resolve_abbreviation/spec.md';
  const files = { [p]: APPROVED_PROPOSAL.replace('要', '不要'), [cur]: APPROVED_SPEC };
  assert.deepEqual(run('spec', [{ status: 'A', path: p }, { status: 'M', path: cur }], files), []);
  const noDate = { ...files, [cur]: '# 機能\n\n- 承認日: （未承認）\n' };
  assert.equal(run('spec', [{ status: 'A', path: p }, { status: 'M', path: cur }], noDate).length, 1);
});

test('仕様 PR: 「実装の変更: 要」で specs/current を書くと止まる', () => {
  const p = 'specs/changes/20260925-x/proposal.md';
  const cur = 'specs/current/resolve_abbreviation/spec.md';
  const errors = run('spec', [{ status: 'A', path: p }, { status: 'M', path: cur }], {
    [p]: APPROVED_PROPOSAL,
    [cur]: APPROVED_SPEC,
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /実装の変更: 不要/);
});

test('実装 PR: specs/changes を releases へ移すのはよいが、書き換えると止まる', () => {
  const cur = 'specs/current/resolve_abbreviation/spec.md';
  const ok = run(
    'impl',
    [
      { status: 'M', path: 'src/lookup.ts' },
      { status: 'M', path: cur },
      { status: 'R', from: 'specs/changes/x/spec.md', path: 'specs/releases/v0.21.0/x/spec.md' },
    ],
    { [cur]: APPROVED_SPEC }
  );
  assert.deepEqual(ok, []);
  const ng = run('impl', [{ status: 'M', path: 'specs/changes/x/spec.md' }]);
  assert.equal(ng.length, 1);
});

test('実装 PR: 取り込んだ specs/current に承認日が無ければ止まる', () => {
  const cur = 'specs/current/resolve_abbreviation/spec.md';
  const errors = run('impl', [{ status: 'M', path: cur }], { [cur]: '- 承認日: （未承認）\n' });
  assert.equal(errors.length, 1);
});

test('初版起こし: spec.md の追加と、テスト名に ID を足すだけの変更は通る', () => {
  const cur = 'specs/current/lookup_by_law_id/spec.md';
  const t = 'src/lookup.test.ts';
  const diff = [
    `--- a/${t}`,
    `+++ b/${t}`,
    '@@ -1 +1 @@',
    "-  it('未知の law_id は null', async () => {",
    "+  it('SPEC-ABBR-LOOKUP-BY-LAW-ID-001 未知の law_id は null', async () => {",
  ].join('\n');
  const errors = run(
    'spec-init',
    [{ status: 'A', path: cur }, { status: 'M', path: t }],
    { [cur]: APPROVED_SPEC },
    { [t]: diff }
  );
  assert.deepEqual(errors, []);
});

test('初版起こし: テストの期待値を変えると止まる', () => {
  const t = 'src/lookup.test.ts';
  const diff = ['@@ -1 +1 @@', "-    expect(lookupByLawId('999XX0000000000')).toBeNull();", "+    expect(lookupByLawId('999XX0000000000')).toBeUndefined();"].join('\n');
  assert.equal(onlyIdsAdded(diff), false);
  const errors = run('spec-init', [{ status: 'M', path: t }], {}, { [t]: diff });
  assert.equal(errors.length, 1);
});

test('初版起こし: 承認日が無ければ止まる、src/ の実装を変えると止まる', () => {
  const cur = 'specs/current/lookup_by_law_id/spec.md';
  const errors = run('spec-init', [
    { status: 'A', path: cur },
    { status: 'M', path: 'src/lookup.ts' },
  ], { [cur]: '- 承認日: （未承認）\n' });
  assert.equal(errors.length, 2);
});

test('specs に触れない PR（docs など）はそのまま通る', () => {
  assert.deepEqual(run('impl', [{ status: 'M', path: 'README.md' }]), []);
});

test('spec-ids init が作る specs/ の .gitkeep は、どの種類の PR でも止めない', () => {
  const keeps = ['current', 'changes', 'releases'].map((d) => ({ status: 'A', path: `specs/${d}/.gitkeep` }));
  for (const kind of ['impl', 'spec-init']) {
    assert.deepEqual(run(kind, keeps), []);
  }
  assert.equal(run('impl', [{ status: 'A', path: 'specs/changes/x/spec.md' }]).length, 1);
});
