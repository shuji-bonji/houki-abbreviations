/**
 * Tests for src/validate.ts (v0.5.0)
 */

import { describe, expect, it } from 'vitest';
import type { AbbreviationEntry } from './types.js';
import { isValidLawId, validateAllEntries, extractLawNames } from './validate.js';

/* -------------------------------------------------------------------------- */
/* isValidLawId                                                               */
/* -------------------------------------------------------------------------- */

describe('isValidLawId', () => {
  it('標準 15 文字フォーマット (Act)', () => {
    expect(isValidLawId('363AC0000000108')).toBe(true);
  });

  it('政令 (CO)', () => {
    expect(isValidLawId('505CO0000000034')).toBe(true);
  });

  it('省令 (MO)', () => {
    expect(isValidLawId('505MO0000000020')).toBe(true);
  });

  it('規則 (RU)', () => {
    expect(isValidLawId('505RU0000000001')).toBe(true);
  });

  it('憲法専用フォーマット', () => {
    expect(isValidLawId('321CONSTITUTION')).toBe(true);
  });

  it('未対応の種別 (DF / M\\d{2} 等) は v0.5.0 では false', () => {
    // e-Gov bulk data には DF 系・M\d{2} 系も存在するが、
    // 正確な仕様未確定のため v0.5.0 では未対応。
    // 将来 v0.6.x で e-Gov 全種別の仕様確認後に対応予定。
    expect(isValidLawId('105DF0000000337')).toBe(false);
  });

  it('未知の種別コード XX は不正', () => {
    expect(isValidLawId('363XX0000000108')).toBe(false);
  });

  it('文字数不足は不正', () => {
    expect(isValidLawId('363AC123')).toBe(false);
  });

  it('文字数超過は不正', () => {
    expect(isValidLawId('363AC00000001080')).toBe(false);
  });

  it('空文字は不正', () => {
    expect(isValidLawId('')).toBe(false);
  });

  it('前後空白は trim しない (呼び出し側責務)', () => {
    expect(isValidLawId(' 363AC0000000108')).toBe(false);
  });

  it('小文字は不正 (e-Gov は大文字英数字のみ)', () => {
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
  it('正常な辞書では valid=true', () => {
    const r = validateAllEntries([validEntry]);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('abbr 重複を error として検出', () => {
    const r = validateAllEntries([validEntry, { ...validEntry, formal: '別の法' }]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === 'duplicate_abbr')).toBe(true);
  });

  it('law_id 重複を error として検出', () => {
    const r = validateAllEntries([validEntry, { ...validEntry, abbr: '別法', formal: '別の法' }]);
    expect(r.errors.some((e) => e.code === 'duplicate_law_id')).toBe(true);
  });

  it('不正な law_id を error として検出', () => {
    const r = validateAllEntries([{ ...validEntry, law_id: 'INVALID' }]);
    expect(r.errors.some((e) => e.code === 'invalid_law_id')).toBe(true);
  });

  it('law_id=null は許容', () => {
    const r = validateAllEntries([{ ...validEntry, law_id: null }]);
    expect(r.valid).toBe(true);
  });

  it('必須フィールド欠損を error として検出', () => {
    const broken = { ...validEntry, formal: '' };
    const r = validateAllEntries([broken]);
    expect(r.errors.some((e) => e.code === 'missing_required_field')).toBe(true);
  });

  it('category × source_mcp_hint 不整合は warning', () => {
    const r = validateAllEntries([{ ...validEntry, source_mcp_hint: 'houki-nta' }]);
    expect(r.warnings.some((w) => w.code === 'category_hint_mismatch')).toBe(true);
    // warning のみ、error にはしない
    expect(r.errors.some((e) => e.code === 'category_hint_mismatch')).toBe(false);
  });

  it('alias が他エントリの abbr と衝突したら warning', () => {
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

  it('実データで全件 valid (回帰防止)', async () => {
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
  it('テキスト中の法令名を抽出 (位置順)', () => {
    const matches = extractLawNames(extractFixtures, '消費税法と法人税法の改正');
    expect(matches.length).toBe(2);
    expect(matches[0].matchedKey).toBe('消費税法');
    expect(matches[0].position).toBe(0);
    expect(matches[1].matchedKey).toBe('法人税法');
    expect(matches[1].position).toBe(5);
  });

  it('aliases も抽出対象', () => {
    const matches = extractLawNames(extractFixtures, 'インボイス制度の対象');
    expect(matches[0].matchedKey).toBe('インボイス制度');
    expect(matches[0].entry.abbr).toBe('消法');
  });

  it('minLength 未満の短いキーはデフォルトで除外', () => {
    // '民' は 1 文字なのでデフォルト minLength=2 で除外される
    const matches = extractLawNames(extractFixtures, '民法の解釈');
    expect(matches.some((m) => m.matchedKey === '民')).toBe(false);
    // '民法' (formal) は 2 文字なのでヒット
    expect(matches.some((m) => m.matchedKey === '民法')).toBe(true);
  });

  it('minLength=1 にすれば 1 文字略称も拾う', () => {
    // テキストに `民法` を含めると preferLonger=true (デフォルト) により
    // `民` が `民法` に包含されて除去されるので、`民法` を含まないテキストで検証
    const matches = extractLawNames(extractFixtures, '民の規定について', { minLength: 1 });
    // '民' (1 文字 abbr) がヒットする
    expect(matches.some((m) => m.matchedKey === '民')).toBe(true);
  });

  it('preferLonger=true で短い包含マッチを除去', () => {
    // '民法' を含むテキストで '民' (1文字) と '民法' (2文字) が両方ヒット
    // → preferLonger により '民' は除去される (位置・範囲が '民法' に包含されるため)
    const matches = extractLawNames(extractFixtures, '民法の解釈', {
      minLength: 1,
      preferLonger: true,
    });
    expect(matches.some((m) => m.matchedKey === '民')).toBe(false);
    expect(matches.some((m) => m.matchedKey === '民法')).toBe(true);
  });

  it('preferLonger=false で全マッチを返す', () => {
    const matches = extractLawNames(extractFixtures, '民法の解釈', {
      minLength: 1,
      preferLonger: false,
    });
    expect(matches.some((m) => m.matchedKey === '民')).toBe(true);
    expect(matches.some((m) => m.matchedKey === '民法')).toBe(true);
  });

  it('dedupe=true で同一エントリのマッチを 1 件に絞る', () => {
    const matches = extractLawNames(extractFixtures, '消費税法と消費税法', { dedupe: true });
    expect(matches.length).toBe(1);
  });

  it('空テキストは空配列', () => {
    expect(extractLawNames(extractFixtures, '')).toEqual([]);
  });

  it('該当なしは空配列', () => {
    expect(extractLawNames(extractFixtures, 'こんにちは世界')).toEqual([]);
  });
});
