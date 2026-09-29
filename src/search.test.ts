/**
 * Tests for src/search.ts (v0.4.0 Track 1)
 *
 * 純関数レベル (entries 引数を受け取る) のテスト。
 * 公開ラッパ (`searchByName(query)` 等) の挙動は src/index.test.ts で検証。
 */

import { describe, expect, it } from 'vitest';
import { abbreviationEntries, findSimilar, searchByName, suggestCorrection } from './index.js';
import { levenshtein } from './search.js';

describe('searchByName', () => {
  it('SPEC-ABBR-SEARCH-BY-NAME-001 contains モード (デフォルト) で formal/abbr/aliases を横断検索', () => {
    const r = searchByName('労働');
    // 「労働基準法」「労働契約法」など労働系がヒットするはず
    expect(r.length).toBeGreaterThan(0);
    const formals = r.map((e) => e.formal);
    expect(formals.some((f) => f.includes('労働'))).toBe(true);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-003 prefix モードで前方一致', () => {
    const r = searchByName('労働', { mode: 'prefix' });
    // 前方一致なので「労働」で始まる formal/abbr/aliases のみ
    expect(r.length).toBeGreaterThan(0);
    expect(
      r.every((e) => {
        const candidates = [e.abbr, e.formal, ...(e.aliases ?? [])];
        return candidates.some((k) => k.startsWith('労働'));
      })
    ).toBe(true);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-004 suffix モードで後方一致', () => {
    const r = searchByName('施行令', { mode: 'suffix' });
    // 「○○施行令」で終わるものがヒット
    expect(r.length).toBeGreaterThan(0);
    expect(
      r.every((e) => {
        const candidates = [e.abbr, e.formal, ...(e.aliases ?? [])];
        return candidates.some((k) => k.endsWith('施行令'));
      })
    ).toBe(true);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-005 filter で domain を絞る', () => {
    const r = searchByName('税', { filter: { domain: 'tax' } });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.domain === 'tax')).toBe(true);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-005 filter で domain 配列', () => {
    const r = searchByName('法', { filter: { domain: ['tax', 'labor'] }, limit: 100 });
    expect(r.every((e) => e.domain === 'tax' || e.domain === 'labor')).toBe(true);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-006 filter で source_mcp_hint', () => {
    const r = searchByName('税', { filter: { source_mcp_hint: 'houki-egov' }, limit: 100 });
    expect(r.every((e) => e.source_mcp_hint === 'houki-egov')).toBe(true);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-007 limit が効く', () => {
    const r = searchByName('法', { limit: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-008 空クエリ / 空白だけは空配列', () => {
    expect(searchByName('')).toEqual([]);
    expect(searchByName('   ')).toEqual([]);
  });

  it('normalize=true (default) で全角入力でもヒット', () => {
    const r = searchByName('労働');
    expect(r.length).toBeGreaterThan(0);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-002 Issue #3: "インボイス" で消費税法エントリがヒット', () => {
    const r = searchByName('インボイス');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => e.formal === '消費税法')).toBe(true);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-002 Issue #3: "ふるさと納税" で所得税法エントリがヒット', () => {
    const r = searchByName('ふるさと納税');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => e.formal === '所得税法')).toBe(true);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-002 Issue #3: "マイナ" でマイナンバー法エントリがヒット', () => {
    const r = searchByName('マイナ');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => e.abbr === 'マイナンバー法')).toBe(true);
  });
});

describe('findSimilar (Levenshtein あいまい一致)', () => {
  it('SPEC-ABBR-FIND-SIMILAR-001 完全一致は distance=0', () => {
    const r = findSimilar('労働基準法');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].distance).toBe(0);
    expect(r[0].entry.formal).toBe('労働基準法');
    // 20261001-dictionary-rules: 5 文字に対する距離 2 は比が 1/3 を超えるので 労基法 の 1 件だけ
    expect(r).toHaveLength(1);
    expect(r[0].entry.abbr).toBe('労基法');
    const s = findSimilar('所得税法施行令');
    expect(s[0].entry.abbr).toBe('所令');
    expect(s[0].entry.formal).toBe('所得税法施行令');
    expect(s[0].matchedKey).toBe('所得税法施行令');
    expect(s[0].distance).toBe(0);
    expect(s.slice(1).map((m) => [m.entry.abbr, m.entry.formal, m.distance])).toEqual([
      ['所規', '所得税法施行規則', 2],
      ['法令', '法人税法施行令', 2],
      ['消令', '消費税法施行令', 2],
      ['相令', '相続税法施行令', 2],
    ]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-002 1 文字 typo (例: 法 → 例) で distance=1 のヒットが返る', () => {
    const r = findSimilar('労働基準法施行例', { maxDistance: 2 });
    // 「労働基準法施行令」が distance=1 でヒットするはず (施行例 → 施行令)
    expect(r.length).toBeGreaterThan(0);
    const top = r[0];
    expect(top.distance).toBeLessThanOrEqual(2);
  });

  it('SPEC-ABBR-FIND-SIMILAR-002 maxDistance を超える typo はヒットしない', () => {
    const r = findSimilar('全く関係ない長い文字列ですよ', { maxDistance: 1 });
    expect(r.length).toBe(0);
  });

  it('SPEC-ABBR-FIND-SIMILAR-003 sortByScore=true (default) で距離昇順', () => {
    const r = findSimilar('労働基準法施行例', { maxDistance: 5 });
    for (let i = 1; i < r.length; i++) {
      expect(r[i].distance).toBeGreaterThanOrEqual(r[i - 1].distance);
    }
    // 20261001-dictionary-rules: 法人税法施行令 は 法令（0）が辞書で前にある 所令（2）より先頭に来る
    const s = findSimilar('法人税法施行令');
    expect(s.map((m) => m.entry.abbr)).toEqual(['法令', '所令', '法規', '消令', '相令']);
    expect(s.map((m) => m.distance)).toEqual([0, 2, 2, 2, 2]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-004 limit が効く', () => {
    // 20261001-dictionary-rules: 所得税法施行令 は limit 3 で 3 件、省くと 5 件、500 なら 7 件
    expect(findSimilar('所得税法施行令', { limit: 3 })).toHaveLength(3);
    expect(findSimilar('所得税法施行令')).toHaveLength(5);
    expect(findSimilar('所得税法施行令', { limit: 500 })).toHaveLength(7);
  });

  it('SPEC-ABBR-FIND-SIMILAR-005 filter が効く', () => {
    // 20261001-dictionary-rules: 所得税法施行令 は domain: tax で 7 件、labor で 0 件
    const r = findSimilar('所得税法施行令', { filter: { domain: 'tax' }, limit: 100 });
    expect(r).toHaveLength(7);
    expect(r.every((m) => m.entry.domain === 'tax')).toBe(true);
    expect(findSimilar('所得税法施行令', { filter: { domain: 'labor' }, limit: 100 })).toEqual([]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-006 空クエリは空配列', () => {
    expect(findSimilar('')).toEqual([]);
    expect(findSimilar('   ')).toEqual([]);
  });
});

describe('suggestCorrection', () => {
  it('SPEC-ABBR-SUGGEST-CORRECTION-001 typo に近い formal を文字列配列で返す', () => {
    const r = suggestCorrection('労働基準法施行例');
    expect(Array.isArray(r)).toBe(true);
    if (r.length > 0) {
      expect(typeof r[0]).toBe('string');
    }
    // 20261001-dictionary-rules: 距離 0 のエントリは入れず、比の上限で 法 は []
    expect(r).toEqual(['労働基準法施行規則']);
    expect(suggestCorrection('所得税法施行令')).toEqual([
      '所得税法施行規則',
      '法人税法施行令',
      '消費税法施行令',
      '相続税法施行令',
      '印紙税法施行令',
    ]);
    expect(suggestCorrection('法')).toEqual([]);
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-002 limit が効く', () => {
    // 20261001-dictionary-rules: 距離 0 の 所得税法施行令 を除いた後で 3 件に打ち切る
    expect(suggestCorrection('所得税法施行令', 3)).toEqual([
      '所得税法施行規則',
      '法人税法施行令',
      '消費税法施行令',
    ]);
  });
});

describe('levenshtein', () => {
  it('SPEC-ABBR-LEVENSHTEIN-001 同一文字列は 0', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('労働基準法', '労働基準法')).toBe(0);
  });

  it('SPEC-ABBR-LEVENSHTEIN-002 片方が空なら長さを返す', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('', '')).toBe(0);
    // 文字数はコードポイント数（'𠮷'.length は 2 だが 1 文字）
    expect(levenshtein('', '𠮷')).toBe(1);
  });

  it('SPEC-ABBR-LEVENSHTEIN-003 1 文字違いで distance=1', () => {
    expect(levenshtein('abc', 'abd')).toBe(1);
    expect(levenshtein('施行例', '施行令')).toBe(1);
  });

  it('SPEC-ABBR-LEVENSHTEIN-003 挿入 / 削除 / 置換が混在', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('SPEC-ABBR-LEVENSHTEIN-004 順序入れ替えに対して対称', () => {
    expect(levenshtein('abc', 'xyz')).toBe(levenshtein('xyz', 'abc'));
  });
});

describe('abbreviationEntries — Issue #3 関連エントリの sanity check', () => {
  it('SPEC-ABBR-ABBREVIATION-ENTRIES-011 消費税法エントリが Issue #3 関連 alias を持つ', () => {
    const e = abbreviationEntries.find((x) => x.abbr === '消法');
    expect(e).toBeDefined();
    expect(e!.aliases).toContain('インボイス');
    expect(e!.aliases).toContain('適格請求書');
    expect(e!.aliases).toContain('軽減税率');
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-011 所得税法エントリが ふるさと納税 alias を持つ', () => {
    const e = abbreviationEntries.find((x) => x.abbr === '所法');
    expect(e).toBeDefined();
    expect(e!.aliases).toContain('ふるさと納税');
    expect(e!.aliases).toContain('寄附金控除');
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-011 電帳法エントリが 電帳 alias を持つ', () => {
    const e = abbreviationEntries.find((x) => x.abbr === '電帳法');
    expect(e).toBeDefined();
    expect(e!.aliases).toContain('電子帳簿保存');
    expect(e!.aliases).toContain('電帳');
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-011 マイナンバー法エントリが マイナ / 個人番号 alias を持つ', () => {
    const e = abbreviationEntries.find((x) => x.abbr === 'マイナンバー法');
    expect(e).toBeDefined();
    expect(e!.aliases).toContain('マイナ');
    expect(e!.aliases).toContain('個人番号');
  });
});

/** 辞書での位置。並びの検査に使う */
const indexOfEntry = (e: (typeof abbreviationEntries)[number]): number =>
  abbreviationEntries.indexOf(e);

const isInDictionaryOrder = (list: readonly (typeof abbreviationEntries)[number][]): boolean =>
  list.every((e, i) => i === 0 || indexOfEntry(list[i - 1]) < indexOfEntry(e));

describe('searchByName — 並び・正規化・filter・limit', () => {
  it('SPEC-ABBR-SEARCH-BY-NAME-009 一致したエントリを辞書の並びのまま返す', () => {
    const r = searchByName('労働');
    expect(r.length).toBeGreaterThan(1);
    expect(isInDictionaryOrder(r)).toBe(true);
    const abbrs = r.map((e) => e.abbr);
    for (const a of ['労基法', '労基則', '労契法', '安衛法', '派遣法', 'パート法']) {
      expect(abbrs).toContain(a);
    }
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-010 複数の名前が一致しても 1 つのエントリは 1 回だけ返す', () => {
    const r = searchByName('消費税');
    expect(new Set(r).size).toBe(r.length);
    expect(r.filter((e) => e.abbr === '消法')).toHaveLength(1);
    expect(r.map((e) => e.abbr)).toEqual(
      expect.arrayContaining(['消法', '消令', '消規', '消基通'])
    );
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-011 既定では全角英数字を半角にしてから比べる', () => {
    const r = searchByName('ＰＬ法');
    expect(r.some((e) => e.formal === '製造物責任法')).toBe(true);
    expect(r).toEqual(searchByName('PL法'));
    expect(searchByName('ＰＬ法', { normalize: true })).toEqual(searchByName('PL法'));
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-012 normalize が false のときは全角英数字をそのまま比べる', () => {
    expect(searchByName('ＰＬ法', { normalize: false })).toEqual([]);
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-013 filter.category で文書の種類を絞る（配列）', () => {
    const r = searchByName('通達', { filter: { category: ['kihon-tsutatsu'] }, limit: 500 });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.category === 'kihon-tsutatsu')).toBe(true);
    expect(r).toEqual(
      searchByName('通達', { limit: 500 }).filter((e) => e.category === 'kihon-tsutatsu')
    );
    expect(r.map((e) => e.abbr)).toEqual(
      expect.arrayContaining([
        '消基通',
        '所基通',
        '法基通',
        '相基通',
        '通基通',
        '徴基通',
        '措通',
        '印基通',
      ])
    );
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-013 filter.category は単一の値でも配列と同じ', () => {
    expect(searchByName('通達', { filter: { category: 'kihon-tsutatsu' }, limit: 500 })).toEqual(
      searchByName('通達', { filter: { category: ['kihon-tsutatsu'] }, limit: 500 })
    );
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-014 filter に複数のキーを渡すと、すべてを満たすエントリだけを返す', () => {
    const r = searchByName('税', {
      filter: { domain: 'tax', source_mcp_hint: 'houki-nta' },
      limit: 500,
    });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.domain === 'tax' && e.source_mcp_hint === 'houki-nta')).toBe(true);
    expect(r).toEqual(
      searchByName('税', { limit: 500 }).filter(
        (e) => e.domain === 'tax' && e.source_mcp_hint === 'houki-nta'
      )
    );
    expect(r.length).toBeLessThan(
      searchByName('税', { filter: { domain: 'tax' }, limit: 500 }).length
    );
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-015 filter のキーに空の配列を渡すと、そのキーでは絞らない', () => {
    expect(searchByName('税', { filter: { domain: [] } })).toEqual(searchByName('税'));
    expect(searchByName('税', { filter: { category: [] } })).toEqual(searchByName('税'));
    expect(searchByName('税', { filter: { source_mcp_hint: [] } })).toEqual(searchByName('税'));
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-016 limit を省くと 50 件で打ち切る', () => {
    const all = searchByName('法', { limit: 500 });
    expect(all.length).toBeGreaterThan(50);
    const r = searchByName('法');
    expect(r).toHaveLength(50);
    expect(r).toEqual(all.slice(0, 50));
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-017 1 未満の limit は 1 として扱う', () => {
    // 20261001-input-guards: 1 として扱わず RangeError を投げる
    const one = searchByName('法', { limit: 1 });
    expect(one).toHaveLength(1);
    expect(one[0].abbr).toBe('所法');
    for (const limit of [0, -3, 0.5]) {
      expect(() => searchByName('法', { limit }), String(limit)).toThrow(RangeError);
    }
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-018 小数の limit は切り上げた件数で打ち切る', () => {
    // 20261001-input-guards: 切り上げず RangeError を投げる
    for (const limit of [1.2, 2.5, 2.9]) {
      expect(() => searchByName('法', { limit }), String(limit)).toThrow(RangeError);
    }
    const all = searchByName('法', { limit: 500 });
    expect(searchByName('法', { limit: 3 })).toEqual(all.slice(0, 3));
    expect(searchByName('法', { limit: 3.0 })).toEqual(all.slice(0, 3));
  });
});

describe('findSimilar — 正規化・並び・limit・maxDistance・matchedKey', () => {
  it('SPEC-ABBR-FIND-SIMILAR-007 既定では全角英数字を半角にしてから比べる', () => {
    const r = findSimilar('ＰＬ法');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].entry.formal).toBe('製造物責任法');
    expect(r[0].matchedKey).toBe('PL法');
    expect(r[0].distance).toBe(0);
    expect(findSimilar('ＰＬ法', { normalize: true })).toEqual(r);
  });

  it('SPEC-ABBR-FIND-SIMILAR-008 normalize が false のときは全角英数字をそのまま比べる', () => {
    // 20261001-dictionary-rules: PL法 との距離 2 は 3 文字に対して比が 1/3 を超えるので []
    expect(findSimilar('ＰＬ法', { normalize: false })).toEqual([]);
    const r = findSimilar('ＰＬ法');
    expect(r).toHaveLength(1);
    expect(r[0].entry.formal).toBe('製造物責任法');
    expect(r[0].matchedKey).toBe('PL法');
    expect(r[0].distance).toBe(0);
  });

  it('SPEC-ABBR-FIND-SIMILAR-009 全角で引いても matchedKey は辞書の表記のまま返す', () => {
    const top = findSimilar('ＰＬ法')[0];
    expect(top.matchedKey).toBe('PL法');
    expect([top.entry.abbr, top.entry.formal, ...(top.entry.aliases ?? [])]).toContain(
      top.matchedKey
    );
  });

  it('SPEC-ABBR-FIND-SIMILAR-010 sortByScore が false のときは辞書の並びのまま limit 件で打ち切る', () => {
    // 20261001-dictionary-rules: 法人税法施行令 の例に差し替え
    const q = '法人税法施行令';
    const r = findSimilar(q, { sortByScore: false });
    expect(r).toHaveLength(5);
    expect(isInDictionaryOrder(r.map((m) => m.entry))).toBe(true);
    expect(r.map((m) => [m.entry.abbr, m.distance])).toEqual([
      ['所令', 2],
      ['法令', 0],
      ['法規', 2],
      ['消令', 2],
      ['相令', 2],
    ]);
    // 距離 0 の 法令 は limit: 1 の打ち切りで入らない
    const one = findSimilar(q, { sortByScore: false, limit: 1 });
    expect(one.map((m) => [m.entry.abbr, m.distance])).toEqual([['所令', 2]]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-011 distance が同じエントリは辞書の並びのまま並べる', () => {
    // 20261001-dictionary-rules: 所得税法施行令 の例に差し替え
    const r = findSimilar('所得税法施行令', { limit: 100 });
    const distances = [...new Set(r.map((m) => m.distance))];
    for (const d of distances) {
      expect(isInDictionaryOrder(r.filter((m) => m.distance === d).map((m) => m.entry))).toBe(true);
    }
    expect(r.filter((m) => m.distance === 2).map((m) => m.entry.abbr)).toEqual([
      '所規',
      '法令',
      '消令',
      '相令',
      '印令',
      '地税令',
    ]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-012 limit を省くと 5 件で打ち切る', () => {
    // 20261001-dictionary-rules: 所得税法施行令 の例に差し替え
    const all = findSimilar('所得税法施行令', { limit: 500 });
    expect(all).toHaveLength(7);
    const r = findSimilar('所得税法施行令');
    expect(r).toHaveLength(5);
    expect(r).toEqual(all.slice(0, 5));
  });

  it('SPEC-ABBR-FIND-SIMILAR-013 1 未満の limit は 1 として扱う', () => {
    // 20261001-input-guards: 1 として扱わず RangeError を投げる
    for (const limit of [0, -1, 0.5]) {
      expect(() => findSimilar('所得税法施行令', { limit }), String(limit)).toThrow(RangeError);
    }
    expect(findSimilar('所得税法施行令', { limit: 1 })).toHaveLength(1);
  });

  it('SPEC-ABBR-FIND-SIMILAR-014 maxDistance を省くと 2 として扱う', () => {
    // 20261001-dictionary-rules: 租税特別措置法施行令 の例に差し替え
    const q = '租税特別措置法施行令';
    const r = findSimilar(q, { limit: 100 });
    expect(r).toEqual(findSimilar(q, { maxDistance: 2, limit: 100 }));
    expect(r.map((m) => [m.entry.abbr, m.entry.formal, m.distance])).toEqual([
      ['措令', '租税特別措置法施行令', 0],
      ['措規', '租税特別措置法施行規則', 2],
    ]);
    expect(r.some((m) => m.entry.abbr === '措法')).toBe(false);
    expect(
      findSimilar(q, { maxDistance: 3, limit: 100 }).some(
        (m) => m.entry.abbr === '措法' && m.distance === 3
      )
    ).toBe(true);
  });

  it('SPEC-ABBR-FIND-SIMILAR-015 maxDistance が 0 のときは名前が一致するエントリだけを返す', () => {
    const r = findSimilar('消費税', { maxDistance: 0 });
    expect(r).toHaveLength(1);
    expect(r[0].entry.abbr).toBe('消法');
    expect(r[0].matchedKey).toBe('消費税');
    expect(r[0].distance).toBe(0);
  });

  it('SPEC-ABBR-FIND-SIMILAR-016 maxDistance が負の値のときは空配列を返す', () => {
    expect(findSimilar('消費税', { maxDistance: -1 })).toEqual([]);
    expect(findSimilar('消法', { maxDistance: -1 })).toEqual([]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-017 略称と別名が同じ距離なら略称を matchedKey にする', () => {
    // 20261001-dictionary-rules: 2 文字の 消費 は比の上限に掛かるので 3 文字の 消費法 で確かめる
    const m = findSimilar('消費法', { maxDistance: 1, limit: 100 }).find(
      (x) => x.entry.abbr === '消法'
    );
    expect(m).toBeDefined();
    expect(m!.distance).toBe(1);
    expect(m!.matchedKey).toBe('消法');
  });

  it('SPEC-ABBR-FIND-SIMILAR-017 正式名称と別名が同じ距離なら正式名称を matchedKey にする', () => {
    const m = findSimilar('消費税X', { maxDistance: 1, limit: 100 }).find(
      (x) => x.entry.abbr === '消法'
    );
    expect(m).toBeDefined();
    expect(m!.distance).toBe(1);
    expect(m!.matchedKey).toBe('消費税法');
  });
});

describe('suggestCorrection — limit・空の query', () => {
  it('SPEC-ABBR-SUGGEST-CORRECTION-003 limit を省くと 5 件で打ち切る', () => {
    // 20261001-dictionary-rules: 所得税法施行令 の例に差し替え
    const r = suggestCorrection('所得税法施行令');
    expect(r).toEqual([
      '所得税法施行規則',
      '法人税法施行令',
      '消費税法施行令',
      '相続税法施行令',
      '印紙税法施行令',
    ]);
    const many = suggestCorrection('所得税法施行令', 100);
    expect(many).toHaveLength(6);
    expect(many.at(-1)).toBe('地方税法施行令');
    expect(r).toEqual(many.slice(0, 5));
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-004 1 未満の limit は 1 として扱う', () => {
    // 20261001-input-guards: 1 として扱わず RangeError を投げる
    for (const limit of [0, -1, 0.5]) {
      expect(() => suggestCorrection('所得税法施行令', limit), String(limit)).toThrow(RangeError);
    }
    expect(suggestCorrection('所得税法施行令', 1)).toHaveLength(1);
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-005 空の query には空配列を返す', () => {
    expect(suggestCorrection('')).toEqual([]);
    expect(suggestCorrection('   ')).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* 20261001-normalize                                                         */
/* -------------------------------------------------------------------------- */

describe('levenshtein — 20261001-normalize', () => {
  it('SPEC-ABBR-LEVENSHTEIN-005 BMP の外の文字（𠮷 U+20BB7）を 1 文字として数え、𠮷 と 吉 の距離は 1', () => {
    expect('𠮷'.length).toBe(2);
    expect(levenshtein('𠮷', '吉')).toBe(1);
    expect(levenshtein('𠮷野家', '吉野家')).toBe(1);
    expect(levenshtein('𠮷', '')).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */
/* 20261001-input-guards                                                      */
/* -------------------------------------------------------------------------- */

/** 数でない limit を渡すための cast（型では number だけを受け付ける） */
const asNumber = (v: unknown): number => v as number;

describe('searchByName — 20261001-input-guards', () => {
  it('SPEC-ABBR-SEARCH-BY-NAME-019 NaN・Infinity・-Infinity の limit には RangeError を投げる', () => {
    for (const limit of [NaN, Infinity, -Infinity]) {
      expect(() => searchByName('法', { limit }), String(limit)).toThrow(RangeError);
    }
  });

  it("SPEC-ABBR-SEARCH-BY-NAME-019 文字列 '3'・null・オブジェクトの limit には TypeError を投げる", () => {
    for (const limit of ['3', null, {}]) {
      expect(() => searchByName('法', { limit: asNumber(limit) }), JSON.stringify(limit)).toThrow(
        TypeError
      );
    }
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-019 undefined の limit は省いたときと同じ 50 件', () => {
    const r = searchByName('法', { limit: undefined });
    expect(r).toHaveLength(50);
    expect(r).toEqual(searchByName('法'));
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-020 501 と 10000 の limit には RangeError を投げ、500 は受け付ける', () => {
    expect(() => searchByName('法', { limit: 501 })).toThrow(RangeError);
    expect(() => searchByName('法', { limit: 10000 })).toThrow(RangeError);
    const r = searchByName('法', { limit: 500 });
    expect(r.length).toBeGreaterThan(50);
    expect(r.length).toBeLessThanOrEqual(500);
  });
});

describe('findSimilar — 20261001-input-guards', () => {
  it('SPEC-ABBR-FIND-SIMILAR-018 小数の limit 2.5 には RangeError を投げ、3 なら 3 件を返す', () => {
    expect(() => findSimilar('所得税法施行令', { limit: 2.5 })).toThrow(RangeError);
    expect(findSimilar('所得税法施行令', { limit: 3 })).toHaveLength(3);
  });

  it('SPEC-ABBR-FIND-SIMILAR-019 NaN・Infinity・-Infinity の limit には RangeError を投げる', () => {
    for (const limit of [NaN, Infinity, -Infinity]) {
      expect(() => findSimilar('所得税法施行令', { limit }), String(limit)).toThrow(RangeError);
    }
  });

  it("SPEC-ABBR-FIND-SIMILAR-019 文字列 '3'・null の limit には TypeError を投げる", () => {
    for (const limit of ['3', null]) {
      expect(
        () => findSimilar('所得税法施行令', { limit: asNumber(limit) }),
        JSON.stringify(limit)
      ).toThrow(TypeError);
    }
  });

  it('SPEC-ABBR-FIND-SIMILAR-019 undefined の limit は省いたときと同じ結果', () => {
    expect(findSimilar('所得税法施行令', { limit: undefined })).toEqual(
      findSimilar('所得税法施行令')
    );
  });

  it('SPEC-ABBR-FIND-SIMILAR-020 501 の limit には RangeError を投げ、500 は候補をすべて返す', () => {
    expect(() => findSimilar('所得税法施行令', { limit: 501 })).toThrow(RangeError);
    const r = findSimilar('所得税法施行令', { limit: 500 });
    expect(r.length).toBeGreaterThan(0);
    expect(r).toEqual(findSimilar('所得税法施行令', { limit: 499 }));
  });
});

describe('suggestCorrection — 20261001-input-guards', () => {
  it('SPEC-ABBR-SUGGEST-CORRECTION-006 小数の limit 2.5 には RangeError を投げ、3 なら 3 件以内を返す', () => {
    expect(() => suggestCorrection('所得税法施行令', 2.5)).toThrow(RangeError);
    expect(suggestCorrection('所得税法施行令', 3).length).toBeLessThanOrEqual(3);
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-007 NaN・Infinity・-Infinity の limit には RangeError を投げる', () => {
    for (const limit of [NaN, Infinity, -Infinity]) {
      expect(() => suggestCorrection('所得税法施行令', limit), String(limit)).toThrow(RangeError);
    }
  });

  it("SPEC-ABBR-SUGGEST-CORRECTION-007 文字列 '3'・null の limit には TypeError を投げる", () => {
    for (const limit of ['3', null]) {
      expect(
        () => suggestCorrection('所得税法施行令', asNumber(limit)),
        JSON.stringify(limit)
      ).toThrow(TypeError);
    }
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-007 undefined の limit は省いたときと同じ結果', () => {
    expect(suggestCorrection('所得税法施行令', undefined)).toEqual(
      suggestCorrection('所得税法施行令')
    );
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-008 501 の limit には RangeError を投げ、500 は候補をすべて返す', () => {
    expect(() => suggestCorrection('所得税法施行令', 501)).toThrow(RangeError);
    const r = suggestCorrection('所得税法施行令', 500);
    expect(r.length).toBeGreaterThan(0);
    expect(r).toEqual(suggestCorrection('所得税法施行令', 499));
  });
});

/* -------------------------------------------------------------------------- */
/* 20261001-dictionary-rules                                                  */
/* -------------------------------------------------------------------------- */

describe('findSimilar — 20261001-dictionary-rules', () => {
  it('SPEC-ABBR-FIND-SIMILAR-021 民法 には 民（0）と 3 文字の 民訴法・民執法・民保法（1）の 4 件を返し、2 文字の 所法 などは返さない', () => {
    const r = findSimilar('民法');
    expect(r.map((m) => [m.entry.abbr, m.matchedKey, m.distance])).toEqual([
      ['民', '民法', 0],
      ['民訴', '民訴法', 1],
      ['民執', '民執法', 1],
      ['民保', '民保法', 1],
    ]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-021 1 文字の 法 は maxDistance: 5 でも [] を返す', () => {
    expect(findSimilar('法', { maxDistance: 5, limit: 100 })).toEqual([]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-021 労基側 には 3 文字に対する距離 1（比 1/3）の 労基法 と 労基則 の 2 件を返す', () => {
    const r = findSimilar('労基側');
    expect(r.map((m) => [m.entry.abbr, m.distance])).toEqual([
      ['労基法', 1],
      ['労基則', 1],
    ]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-022 1 文字の 民 でも一致すれば distance 0 で返す', () => {
    const r = findSimilar('民');
    expect(r.map((m) => [m.entry.abbr, m.matchedKey, m.distance])).toEqual([['民', '民', 0]]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-022 会社 には 会社（0）と 会社規（1）の 2 件を返す', () => {
    const r = findSimilar('会社');
    expect(r.map((m) => [m.entry.abbr, m.matchedKey, m.distance])).toEqual([
      ['会社', '会社', 0],
      ['会社規', '会社規', 1],
    ]);
  });
});

describe('suggestCorrection — 20261001-dictionary-rules', () => {
  it('SPEC-ABBR-SUGGEST-CORRECTION-009 民法 に一致した 民法 自身は入れず、民事訴訟法・民事執行法・民事保全法 を返す', () => {
    expect(suggestCorrection('民法')).toEqual(['民事訴訟法', '民事執行法', '民事保全法']);
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-009 労働基準法 は一致するエントリしか無いので []、労基側 は 労働基準法・労働基準法施行規則', () => {
    expect(suggestCorrection('労働基準法')).toEqual([]);
    expect(suggestCorrection('労基側')).toEqual(['労働基準法', '労働基準法施行規則']);
  });
});
