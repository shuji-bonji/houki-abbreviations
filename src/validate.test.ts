/**
 * Tests for src/validate.ts (v0.5.0)
 */

import { describe, expect, it } from 'vitest';
import type { AbbreviationEntry } from './types.js';
import { isValidLawId, validateAllEntries, extractLawNames } from './validate.js';
import { extractLawNames as extractFromBundled } from './index.js';

/* -------------------------------------------------------------------------- */
/* isValidLawId                                                               */
/* -------------------------------------------------------------------------- */

describe('isValidLawId', () => {
  it('SPEC-ABBR-IS-VALID-LAW-ID-001 標準 15 文字フォーマット (Act)', () => {
    expect(isValidLawId('363AC0000000108')).toBe(true);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-001 政令 (CO)', () => {
    expect(isValidLawId('505CO0000000034')).toBe(true);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-001 勅令 (IO)', () => {
    expect(isValidLawId('320IO0000000730')).toBe(true);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-001 太政官布告 (DF) / 太政官達 (DT) — v0.6.0 から', () => {
    expect(isValidLawId('105DF0000000337')).toBe(true);
    expect(isValidLawId('108DT0000000152')).toBe(true);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-002 省令 (M + 府省コード) — v0.6.0 から', () => {
    expect(isValidLawId('340M50000040011')).toBe(true); // 所得税法施行規則
    expect(isValidLawId('415M60000F4A003')).toBe(true); // 共同省令（16 進の府省コード）
    expect(isValidLawId('122M10000001012')).toBe(true); // 明治の閣令
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-002 規則・庁令 (R + 府省コード) — v0.6.0 から', () => {
    expect(isValidLawId('322R00000001001')).toBe(true); // 会計検査院規則
    expect(isValidLawId('326R00000002002')).toBe(true); // 海上保安庁令
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-003 人事院規則 (RJNJ) / 内閣総理大臣決定 (RPMD) — v0.6.0 から', () => {
    expect(isValidLawId('324RJNJ01001000')).toBe(true);
    expect(isValidLawId('351RPMD12230000')).toBe(true);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-004 憲法専用フォーマット', () => {
    expect(isValidLawId('321CONSTITUTION')).toBe(true);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-005 e-Gov に無い MO / RU は v0.6.0 から false', () => {
    expect(isValidLawId('505MO0000000020')).toBe(false);
    expect(isValidLawId('505RU0000000001')).toBe(false);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-002 M 系の府省コードに 16 進以外の文字があれば不正', () => {
    expect(isValidLawId('415M60000G4A003')).toBe(false);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-006 未知の種別コード XX は不正', () => {
    expect(isValidLawId('363XX0000000108')).toBe(false);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-007 文字数不足は不正', () => {
    expect(isValidLawId('363AC123')).toBe(false);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-007 文字数超過は不正', () => {
    expect(isValidLawId('363AC00000001080')).toBe(false);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-008 空文字は不正', () => {
    expect(isValidLawId('')).toBe(false);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-009 前後空白は trim しない (呼び出し側責務)', () => {
    expect(isValidLawId(' 363AC0000000108')).toBe(false);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-010 小文字は不正 (e-Gov は大文字英数字のみ)', () => {
    expect(isValidLawId('363ac0000000108')).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* validateAllEntries                                                         */
/* -------------------------------------------------------------------------- */

const validEntry: AbbreviationEntry = {
  abbr: '消法',
  formal: '消費税法',
  law_id: '363AC0000000108',
  domain: 'tax',
  category: 'law',
  source_mcp_hint: 'houki-egov',
};

describe('validateAllEntries', () => {
  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-001 正常な辞書では valid=true', () => {
    const r = validateAllEntries([validEntry]);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-002 abbr 重複を error として検出', () => {
    const r = validateAllEntries([validEntry, { ...validEntry, formal: '別の法' }]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === 'duplicate_abbr')).toBe(true);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-003 law_id 重複を error として検出', () => {
    const r = validateAllEntries([validEntry, { ...validEntry, abbr: '別法', formal: '別の法' }]);
    expect(r.errors.some((e) => e.code === 'duplicate_law_id')).toBe(true);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-004 不正な law_id を error として検出', () => {
    const r = validateAllEntries([{ ...validEntry, law_id: 'INVALID' }]);
    expect(r.errors.some((e) => e.code === 'invalid_law_id')).toBe(true);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-005 law_id=null は許容', () => {
    const r = validateAllEntries([{ ...validEntry, law_id: null }]);
    expect(r.valid).toBe(true);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-006 必須フィールド欠損を error として検出', () => {
    const broken = { ...validEntry, formal: '' };
    const r = validateAllEntries([broken]);
    expect(r.errors.some((e) => e.code === 'missing_required_field')).toBe(true);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-007 category × source_mcp_hint 不整合は warning', () => {
    const r = validateAllEntries([{ ...validEntry, source_mcp_hint: 'houki-nta' }]);
    expect(r.warnings.some((w) => w.code === 'category_hint_mismatch')).toBe(true);
    // warning のみ、error にはしない
    expect(r.errors.some((e) => e.code === 'category_hint_mismatch')).toBe(false);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-008 alias が他エントリの abbr と衝突したら warning', () => {
    const r = validateAllEntries([
      validEntry,
      {
        ...validEntry,
        abbr: '法人税',
        formal: '法人税法',
        law_id: '340AC0000000034',
        aliases: ['消法'], // 他エントリの abbr と衝突
      },
    ]);
    expect(r.warnings.some((w) => w.code === 'alias_collides_with_abbr')).toBe(true);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-009 実データで全件 valid (回帰防止)', async () => {
    const { abbreviationEntries } = await import('./index.js');
    const r = validateAllEntries(abbreviationEntries as AbbreviationEntry[]);
    if (!r.valid) {
      console.error('errors:', r.errors);
    }
    expect(r.valid).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* extractLawNames                                                            */
/* -------------------------------------------------------------------------- */

const extractFixtures: AbbreviationEntry[] = [
  {
    abbr: '消法',
    formal: '消費税法',
    law_id: '363AC0000000108',
    domain: 'tax',
    category: 'law',
    source_mcp_hint: 'houki-egov',
    aliases: ['インボイス制度'],
  },
  {
    abbr: '法法',
    formal: '法人税法',
    law_id: '340AC0000000034',
    domain: 'tax',
    category: 'law',
    source_mcp_hint: 'houki-egov',
  },
  {
    abbr: '民',
    formal: '民法',
    law_id: null,
    domain: 'civil',
    category: 'law',
    source_mcp_hint: 'houki-egov',
  },
];

describe('extractLawNames', () => {
  it('SPEC-ABBR-EXTRACT-LAW-NAMES-001 テキスト中の法令名を抽出 (位置順)', () => {
    const matches = extractLawNames(extractFixtures, '消費税法と法人税法の改正');
    expect(matches.length).toBe(2);
    expect(matches[0].matchedKey).toBe('消費税法');
    expect(matches[0].position).toBe(0);
    expect(matches[1].matchedKey).toBe('法人税法');
    expect(matches[1].position).toBe(5);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-002 aliases も抽出対象', () => {
    const matches = extractLawNames(extractFixtures, 'インボイス制度の対象');
    expect(matches[0].matchedKey).toBe('インボイス制度');
    expect(matches[0].entry.abbr).toBe('消法');
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-003 minLength 未満の短いキーはデフォルトで除外', () => {
    // '民' は 1 文字なのでデフォルト minLength=2 で除外される
    const matches = extractLawNames(extractFixtures, '民法の解釈');
    expect(matches.some((m) => m.matchedKey === '民')).toBe(false);
    // '民法' (formal) は 2 文字なのでヒット
    expect(matches.some((m) => m.matchedKey === '民法')).toBe(true);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-004 minLength=1 にすれば 1 文字略称も拾う', () => {
    // テキストに `民法` を含めると preferLonger=true (デフォルト) により
    // `民` が `民法` に包含されて除去されるので、`民法` を含まないテキストで検証
    const matches = extractLawNames(extractFixtures, '民の規定について', { minLength: 1 });
    // '民' (1 文字 abbr) がヒットする
    expect(matches.some((m) => m.matchedKey === '民')).toBe(true);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-005 preferLonger=true で短い包含マッチを除去', () => {
    // '民法' を含むテキストで '民' (1文字) と '民法' (2文字) が両方ヒット
    // → preferLonger により '民' は除去される (位置・範囲が '民法' に包含されるため)
    const matches = extractLawNames(extractFixtures, '民法の解釈', {
      minLength: 1,
      preferLonger: true,
    });
    expect(matches.some((m) => m.matchedKey === '民')).toBe(false);
    expect(matches.some((m) => m.matchedKey === '民法')).toBe(true);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-006 preferLonger=false で全マッチを返す', () => {
    const matches = extractLawNames(extractFixtures, '民法の解釈', {
      minLength: 1,
      preferLonger: false,
    });
    expect(matches.some((m) => m.matchedKey === '民')).toBe(true);
    expect(matches.some((m) => m.matchedKey === '民法')).toBe(true);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-007 dedupe=true で同一エントリのマッチを 1 件に絞る', () => {
    const matches = extractLawNames(extractFixtures, '消費税法と消費税法', { dedupe: true });
    expect(matches.length).toBe(1);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-008 空テキストは空配列', () => {
    expect(extractLawNames(extractFixtures, '')).toEqual([]);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-009 該当なしは空配列', () => {
    expect(extractLawNames(extractFixtures, 'こんにちは世界')).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* 20260927-untested-behaviors                                                */
/* -------------------------------------------------------------------------- */

describe('isValidLawId（文字列でない値・全角）', () => {
  it('SPEC-ABBR-IS-VALID-LAW-ID-011 文字列でない値は false', () => {
    expect(isValidLawId(null as unknown as string)).toBe(false);
    expect(isValidLawId(undefined as unknown as string)).toBe(false);
    expect(isValidLawId(123 as unknown as string)).toBe(false);
  });

  it('SPEC-ABBR-IS-VALID-LAW-ID-012 全角の英字・数字を含むと false', () => {
    expect(isValidLawId('363ＡC0000000108')).toBe(false);
    expect(isValidLawId('363AC000000010８')).toBe(false);
  });
});

const baseEntry: AbbreviationEntry = {
  abbr: 'A1',
  formal: 'F1',
  law_id: null,
  domain: 'tax',
  category: 'law',
  source_mcp_hint: 'houki-egov',
};

describe('validateAllEntries（警告・エラーの中身）', () => {
  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-010 1 件の中で重なる別名は警告で、valid は true のまま', () => {
    const entry: AbbreviationEntry = { ...baseEntry, aliases: ['Q', 'Q'] };
    const r = validateAllEntries([entry]);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.code)).toEqual(['duplicate_alias_within_entry']);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-011 law_id が空文字なら invalid_law_id のエラー', () => {
    const r = validateAllEntries([{ ...baseEntry, law_id: '' }]);
    expect(r.valid).toBe(false);
    expect(r.errors.map((e) => e.code)).toEqual(['invalid_law_id']);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-012 形の誤った同じ law_id が 2 件なら invalid_law_id 2 件と duplicate_law_id 1 件', () => {
    const a1: AbbreviationEntry = { ...baseEntry, law_id: '' };
    const a2: AbbreviationEntry = { ...baseEntry, abbr: 'A2', formal: 'F2', law_id: '' };
    const r = validateAllEntries([a1, a2]);
    const summary = r.errors.map((e) => ({ code: e.code, abbr: e.entry?.abbr }));
    expect(summary).toHaveLength(3);
    expect(summary).toEqual(
      expect.arrayContaining([
        { code: 'invalid_law_id', abbr: 'A1' },
        { code: 'invalid_law_id', abbr: 'A2' },
        { code: 'duplicate_law_id', abbr: 'A2' },
      ])
    );
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-013 エラーの entry は渡したそのエントリを指す', () => {
    const broken: AbbreviationEntry = { ...baseEntry, formal: '' };
    const r = validateAllEntries([broken]);
    const issue = r.errors.find((e) => e.code === 'missing_required_field');
    expect(issue).toBeDefined();
    expect(issue?.entry).toBe(broken);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-013 duplicate_abbr の entry は 2 件目のエントリ', () => {
    const first: AbbreviationEntry = { ...baseEntry };
    const second: AbbreviationEntry = { ...baseEntry };
    const r = validateAllEntries([first, second]);
    const issue = r.errors.find((e) => e.code === 'duplicate_abbr');
    expect(issue).toBeDefined();
    expect(issue?.entry).toBe(second);
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-013 どのエラー・警告にも渡した配列の要素が entry として付く', () => {
    const entries: AbbreviationEntry[] = [
      { ...baseEntry, law_id: 'INVALID', aliases: ['Q', 'Q'] },
      { ...baseEntry, abbr: 'B1', formal: '', aliases: ['A1'] },
      { ...baseEntry, abbr: 'B1', formal: 'F3', law_id: '' },
    ];
    const r = validateAllEntries(entries);
    const issues = [...r.errors, ...r.warnings];
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(entries).toContain(issue.entry);
    }
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-014 invalid_law_id のエラーの message に abbr が入る', () => {
    const r = validateAllEntries([{ ...baseEntry, law_id: 'INVALID' }]);
    const issue = r.errors.find((e) => e.code === 'invalid_law_id');
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('A1');
  });

  it('SPEC-ABBR-VALIDATE-ALL-ENTRIES-014 alias_collides_with_abbr の警告の message に abbr が入る', () => {
    const r = validateAllEntries([
      { ...baseEntry },
      { ...baseEntry, abbr: 'B1', formal: 'F2', aliases: ['A1'] },
    ]);
    const issue = r.warnings.find((w) => w.code === 'alias_collides_with_abbr');
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('B1');
  });
});

describe('extractLawNames（既定値・重なり・null）', () => {
  it('SPEC-ABBR-EXTRACT-LAW-NAMES-010 preferLonger を指定しなければ短い包含一致を返さない', () => {
    const matches = extractFromBundled('民法の解釈', { minLength: 1 });
    expect(matches.some((m) => m.matchedKey === '民' && m.position === 0 && m.length === 1)).toBe(
      false
    );
    expect(matches.some((m) => m.matchedKey === '民法' && m.position === 0 && m.length === 2)).toBe(
      true
    );
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-010 preferLonger: false を足すと短い一致も返る（対照）', () => {
    const matches = extractFromBundled('民法の解釈', { minLength: 1, preferLonger: false });
    expect(matches.some((m) => m.matchedKey === '民' && m.position === 0 && m.length === 1)).toBe(
      true
    );
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-011 minLength が 0 や負の数なら 1 として扱う', () => {
    for (const minLength of [0, -5]) {
      const matches = extractFromBundled('民の規定', { minLength });
      expect(matches.some((m) => m.matchedKey === '民' && m.position === 0)).toBe(true);
    }
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-011 minLength を指定しなければ 1 文字のキーは探さない（対照）', () => {
    expect(extractFromBundled('民の規定')).toEqual([]);
  });

  const sameKeyFixtures: AbbreviationEntry[] = [
    {
      abbr: '甲',
      formal: '甲法',
      law_id: null,
      domain: 'civil',
      category: 'law',
      source_mcp_hint: 'houki-egov',
    },
    {
      abbr: '乙',
      formal: '乙法',
      law_id: null,
      domain: 'civil',
      category: 'law',
      source_mcp_hint: 'houki-egov',
      aliases: ['甲法'],
    },
  ];

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-012 同じ位置・同じ長さで別のエントリに一致したら両方を返す', () => {
    const matches = extractLawNames(sameKeyFixtures, '甲法の規定');
    expect(
      matches.map((m) => ({
        abbr: m.entry.abbr,
        matchedKey: m.matchedKey,
        position: m.position,
        length: m.length,
      }))
    ).toEqual([
      { abbr: '甲', matchedKey: '甲法', position: 0, length: 2 },
      { abbr: '乙', matchedKey: '甲法', position: 0, length: 2 },
    ]);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-012 dedupe: true でも別のエントリなので 2 件のまま', () => {
    const plain = extractLawNames(sameKeyFixtures, '甲法の規定');
    const deduped = extractLawNames(sameKeyFixtures, '甲法の規定', { dedupe: true });
    expect(deduped).toEqual(plain);
    expect(deduped).toHaveLength(2);
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-013 dedupe: true では前にある短いキーの一致を残す', () => {
    const matches = extractFromBundled('消法と消費税法', { dedupe: true });
    expect(matches).toHaveLength(1);
    expect(matches[0].matchedKey).toBe('消法');
    expect(matches[0].position).toBe(0);
    expect(matches[0].entry.abbr).toBe('消法');
  });

  it('SPEC-ABBR-EXTRACT-LAW-NAMES-014 text が null か undefined なら空の配列', () => {
    expect(extractFromBundled(null as unknown as string)).toEqual([]);
    expect(extractFromBundled(undefined as unknown as string)).toEqual([]);
  });
});
