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
  });

  it('SPEC-ABBR-FIND-SIMILAR-004 limit が効く', () => {
    const r = findSimilar('法', { maxDistance: 5, limit: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it('SPEC-ABBR-FIND-SIMILAR-005 filter が効く', () => {
    const r = findSimilar('法', {
      maxDistance: 5,
      filter: { domain: 'tax' },
      limit: 100,
    });
    expect(r.every((m) => m.entry.domain === 'tax')).toBe(true);
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
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-002 limit が効く', () => {
    const r = suggestCorrection('法', 3);
    expect(r.length).toBeLessThanOrEqual(3);
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
    const one = searchByName('法', { limit: 1 });
    expect(one).toHaveLength(1);
    expect(one[0].abbr).toBe('所法');
    for (const limit of [0, -3, 0.5]) {
      expect(searchByName('法', { limit })).toEqual(one);
    }
  });

  it('SPEC-ABBR-SEARCH-BY-NAME-018 小数の limit は切り上げた件数で打ち切る', () => {
    const all = searchByName('法', { limit: 500 });
    expect(searchByName('法', { limit: 1.2 })).toEqual(all.slice(0, 2));
    expect(searchByName('法', { limit: 2.5 })).toEqual(all.slice(0, 3));
    expect(searchByName('法', { limit: 2.9 })).toEqual(all.slice(0, 3));
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
    const r = findSimilar('ＰＬ法', { normalize: false });
    expect(r.some((m) => m.entry.formal === '製造物責任法')).toBe(false);
    expect(r.map((m) => m.entry.abbr)).toEqual(['所法', '法法', '消法', '措法', '相法']);
    expect(r.every((m) => m.distance === 2)).toBe(true);
  });

  it('SPEC-ABBR-FIND-SIMILAR-009 全角で引いても matchedKey は辞書の表記のまま返す', () => {
    const top = findSimilar('ＰＬ法')[0];
    expect(top.matchedKey).toBe('PL法');
    expect([top.entry.abbr, top.entry.formal, ...(top.entry.aliases ?? [])]).toContain(
      top.matchedKey
    );
  });

  it('SPEC-ABBR-FIND-SIMILAR-010 sortByScore が false のときは辞書の並びのまま limit 件で打ち切る', () => {
    const q = '労働基準法施行例';
    const r = findSimilar(q, { maxDistance: 5, sortByScore: false });
    const unsortedAll = findSimilar(q, { maxDistance: 5, sortByScore: false, limit: 1000 });
    expect(r).toHaveLength(5);
    expect(r).toEqual(unsortedAll.slice(0, 5));
    expect(isInDictionaryOrder(unsortedAll.map((m) => m.entry))).toBe(true);
    expect(r.map((m) => m.entry.abbr)).toEqual(['所令', '法令', '消令', '相令', '通令']);
    // 距離の小さい 労基則 は打ち切りで入らない（sortByScore の既定では入る）
    expect(r.some((m) => m.entry.abbr === '労基則')).toBe(false);
    expect(findSimilar(q, { maxDistance: 5 }).some((m) => m.entry.abbr === '労基則')).toBe(true);
  });

  it('SPEC-ABBR-FIND-SIMILAR-011 distance が同じエントリは辞書の並びのまま並べる', () => {
    const r = findSimilar('労働基準法施行例', { maxDistance: 5, limit: 100 });
    const distances = [...new Set(r.map((m) => m.distance))];
    for (const d of distances) {
      expect(isInDictionaryOrder(r.filter((m) => m.distance === d).map((m) => m.entry))).toBe(true);
    }
    expect(
      r
        .filter((m) => m.distance === 5)
        .map((m) => m.entry.abbr)
        .slice(0, 10)
    ).toEqual([
      '所令',
      '法令',
      '消令',
      '相令',
      '通令',
      '印令',
      '地税令',
      '労契法',
      '労組法',
      '建基法',
    ]);
  });

  it('SPEC-ABBR-FIND-SIMILAR-012 limit を省くと 5 件で打ち切る', () => {
    const all = findSimilar('法', { maxDistance: 5, limit: 1000 });
    expect(all.length).toBeGreaterThan(5);
    const r = findSimilar('法', { maxDistance: 5 });
    expect(r).toHaveLength(5);
    expect(r).toEqual(all.slice(0, 5));
  });

  it('SPEC-ABBR-FIND-SIMILAR-013 1 未満の limit は 1 として扱う', () => {
    const one = findSimilar('法', { maxDistance: 5, limit: 1 });
    expect(one).toHaveLength(1);
    expect(one[0].entry.abbr).toBe('所法');
    expect(one[0].distance).toBe(1);
    for (const limit of [0, -1, 0.5]) {
      expect(findSimilar('法', { maxDistance: 5, limit })).toEqual(one);
    }
  });

  it('SPEC-ABBR-FIND-SIMILAR-014 maxDistance を省くと 2 として扱う', () => {
    const q = '労働基準法施行例';
    const r = findSimilar(q, { limit: 100 });
    expect(r).toEqual(findSimilar(q, { maxDistance: 2, limit: 100 }));
    expect(r.every((m) => m.distance <= 2)).toBe(true);
    expect(r.some((m) => m.entry.abbr === '労基則' && m.distance === 2)).toBe(true);
    expect(r.some((m) => m.entry.abbr === '労基法')).toBe(false);
    expect(
      findSimilar(q, { maxDistance: 3, limit: 100 }).some((m) => m.entry.abbr === '労基法')
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
    const m = findSimilar('消費', { maxDistance: 1, limit: 100 }).find(
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
    const r = suggestCorrection('法');
    expect(r).toEqual(['所得税法', '法人税法', '法人税法施行令', '法人税法施行規則', '消費税法']);
    const many = suggestCorrection('法', 100);
    expect(many).toHaveLength(100);
    expect(r).toEqual(many.slice(0, 5));
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-004 1 未満の limit は 1 として扱う', () => {
    expect(suggestCorrection('法', 0)).toEqual(['所得税法']);
    expect(suggestCorrection('法', -1)).toEqual(['所得税法']);
    expect(suggestCorrection('法', 0)).toEqual(suggestCorrection('法', 1));
  });

  it('SPEC-ABBR-SUGGEST-CORRECTION-005 空の query には空配列を返す', () => {
    expect(suggestCorrection('')).toEqual([]);
    expect(suggestCorrection('   ')).toEqual([]);
  });
});
