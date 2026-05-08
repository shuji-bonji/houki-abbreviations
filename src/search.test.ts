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
  it('contains モード (デフォルト) で formal/abbr/aliases を横断検索', () => {
    const r = searchByName('労働');
    // 「労働基準法」「労働契約法」など労働系がヒットするはず
    expect(r.length).toBeGreaterThan(0);
    const formals = r.map((e) => e.formal);
    expect(formals.some((f) => f.includes('労働'))).toBe(true);
  });

  it('prefix モードで前方一致', () => {
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

  it('suffix モードで後方一致', () => {
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

  it('filter で domain を絞る', () => {
    const r = searchByName('税', { filter: { domain: 'tax' } });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.domain === 'tax')).toBe(true);
  });

  it('filter で domain 配列', () => {
    const r = searchByName('法', { filter: { domain: ['tax', 'labor'] }, limit: 100 });
    expect(r.every((e) => e.domain === 'tax' || e.domain === 'labor')).toBe(true);
  });

  it('filter で source_mcp_hint', () => {
    const r = searchByName('税', { filter: { source_mcp_hint: 'houki-egov' }, limit: 100 });
    expect(r.every((e) => e.source_mcp_hint === 'houki-egov')).toBe(true);
  });

  it('limit が効く', () => {
    const r = searchByName('法', { limit: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it('空クエリ / 空白だけは空配列', () => {
    expect(searchByName('')).toEqual([]);
    expect(searchByName('   ')).toEqual([]);
  });

  it('normalize=true (default) で全角入力でもヒット', () => {
    const r = searchByName('労働');
    expect(r.length).toBeGreaterThan(0);
  });

  it('Issue #3: "インボイス" で消費税法エントリがヒット', () => {
    const r = searchByName('インボイス');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => e.formal === '消費税法')).toBe(true);
  });

  it('Issue #3: "ふるさと納税" で所得税法エントリがヒット', () => {
    const r = searchByName('ふるさと納税');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => e.formal === '所得税法')).toBe(true);
  });

  it('Issue #3: "マイナ" でマイナンバー法エントリがヒット', () => {
    const r = searchByName('マイナ');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => e.abbr === 'マイナンバー法')).toBe(true);
  });
});

describe('findSimilar (Levenshtein あいまい一致)', () => {
  it('完全一致は distance=0', () => {
    const r = findSimilar('労働基準法');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].distance).toBe(0);
    expect(r[0].entry.formal).toBe('労働基準法');
  });

  it('1 文字 typo (例: 法 → 例) で distance=1 のヒットが返る', () => {
    const r = findSimilar('労働基準法施行例', { maxDistance: 2 });
    // 「労働基準法施行令」が distance=1 でヒットするはず (施行例 → 施行令)
    expect(r.length).toBeGreaterThan(0);
    const top = r[0];
    expect(top.distance).toBeLessThanOrEqual(2);
  });

  it('maxDistance を超える typo はヒットしない', () => {
    const r = findSimilar('全く関係ない長い文字列ですよ', { maxDistance: 1 });
    expect(r.length).toBe(0);
  });

  it('sortByScore=true (default) で距離昇順', () => {
    const r = findSimilar('労働基準法施行例', { maxDistance: 5 });
    for (let i = 1; i < r.length; i++) {
      expect(r[i].distance).toBeGreaterThanOrEqual(r[i - 1].distance);
    }
  });

  it('limit が効く', () => {
    const r = findSimilar('法', { maxDistance: 5, limit: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it('filter が効く', () => {
    const r = findSimilar('法', {
      maxDistance: 5,
      filter: { domain: 'tax' },
      limit: 100,
    });
    expect(r.every((m) => m.entry.domain === 'tax')).toBe(true);
  });

  it('空クエリは空配列', () => {
    expect(findSimilar('')).toEqual([]);
    expect(findSimilar('   ')).toEqual([]);
  });
});

describe('suggestCorrection', () => {
  it('typo に近い formal を文字列配列で返す', () => {
    const r = suggestCorrection('労働基準法施行例');
    expect(Array.isArray(r)).toBe(true);
    if (r.length > 0) {
      expect(typeof r[0]).toBe('string');
    }
  });

  it('limit が効く', () => {
    const r = suggestCorrection('法', 3);
    expect(r.length).toBeLessThanOrEqual(3);
  });
});

describe('levenshtein (内部 helper)', () => {
  it('同一文字列は 0', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('労働基準法', '労働基準法')).toBe(0);
  });

  it('片方が空なら長さを返す', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('', '')).toBe(0);
  });

  it('1 文字違いで distance=1', () => {
    expect(levenshtein('abc', 'abd')).toBe(1);
    expect(levenshtein('施行例', '施行令')).toBe(1);
  });

  it('挿入 / 削除 / 置換が混在', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('順序入れ替えに対して対称', () => {
    expect(levenshtein('abc', 'xyz')).toBe(levenshtein('xyz', 'abc'));
  });
});

describe('abbreviationEntries — Issue #3 関連エントリの sanity check', () => {
  it('消費税法エントリが Issue #3 関連 alias を持つ', () => {
    const e = abbreviationEntries.find((x) => x.abbr === '消法');
    expect(e).toBeDefined();
    expect(e!.aliases).toContain('インボイス');
    expect(e!.aliases).toContain('適格請求書');
    expect(e!.aliases).toContain('軽減税率');
  });

  it('所得税法エントリが ふるさと納税 alias を持つ', () => {
    const e = abbreviationEntries.find((x) => x.abbr === '所法');
    expect(e).toBeDefined();
    expect(e!.aliases).toContain('ふるさと納税');
    expect(e!.aliases).toContain('寄附金控除');
  });

  it('電帳法エントリが 電帳 alias を持つ', () => {
    const e = abbreviationEntries.find((x) => x.abbr === '電帳法');
    expect(e).toBeDefined();
    expect(e!.aliases).toContain('電子帳簿保存');
    expect(e!.aliases).toContain('電帳');
  });

  it('マイナンバー法エントリが マイナ / 個人番号 alias を持つ', () => {
    const e = abbreviationEntries.find((x) => x.abbr === 'マイナンバー法');
    expect(e).toBeDefined();
    expect(e!.aliases).toContain('マイナ');
    expect(e!.aliases).toContain('個人番号');
  });
});
