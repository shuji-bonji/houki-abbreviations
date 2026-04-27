import { describe, it, expect } from 'vitest';
import {
  abbreviationEntries,
  resolveAbbreviation,
  listByDomain,
  listByCategory,
  listBySourceMcpHint,
  getAbbreviationStats,
  CATEGORIES,
  DOMAINS,
  SOURCE_MCP_HINTS,
  type AbbreviationEntry,
} from './index.js';

// e-Gov law_id format:
//   - 3桁(元号+年) + 2文字(種別) + 10桁(番号)  例: 363AC0000000108
//   - 憲法のみ: "321CONSTITUTION"
const LAW_ID_PATTERN = /^(?:\d{3}[A-Z]{2}\d{10}|\d{3}CONSTITUTION)$/;

const VALID_LAW_TYPES = [
  'Act',
  'CabinetOrder',
  'ImperialOrdinance',
  'MinisterialOrdinance',
  'Rule',
] as const;

describe('abbreviation dictionary integrity', () => {
  it('has entries across all 6 domains', () => {
    const stats = getAbbreviationStats();
    expect(stats.total).toBeGreaterThan(100);
    for (const d of DOMAINS) {
      expect(stats.byDomain[d], `domain ${d} has zero entries`).toBeGreaterThan(0);
    }
  });

  it('every entry has required fields (abbr, formal, domain, category, source_mcp_hint)', () => {
    for (const e of abbreviationEntries) {
      expect(e.abbr, JSON.stringify(e)).toBeTruthy();
      expect(e.formal, JSON.stringify(e)).toBeTruthy();
      expect(DOMAINS, JSON.stringify(e)).toContain(e.domain);
      expect(CATEGORIES, JSON.stringify(e)).toContain(e.category);
      expect(SOURCE_MCP_HINTS, JSON.stringify(e)).toContain(e.source_mcp_hint);
    }
  });

  it('law_id (when set) matches e-Gov format', () => {
    for (const e of abbreviationEntries) {
      if (e.law_id != null) {
        expect(e.law_id, `${e.formal} has invalid law_id: ${e.law_id}`).toMatch(LAW_ID_PATTERN);
      }
    }
  });

  it('law_type (when set) is a valid e-Gov type', () => {
    for (const e of abbreviationEntries) {
      if (e.law_type) {
        expect(VALID_LAW_TYPES, JSON.stringify(e)).toContain(e.law_type);
      }
    }
  });

  it('abbr values are unique across files', () => {
    const seen = new Map<string, AbbreviationEntry>();
    const dupes: string[] = [];
    for (const e of abbreviationEntries) {
      const prev = seen.get(e.abbr);
      if (prev) {
        dupes.push(`"${e.abbr}": ${prev.formal} (${prev.domain}) vs ${e.formal} (${e.domain})`);
      } else {
        seen.set(e.abbr, e);
      }
    }
    expect(dupes, `duplicate abbreviations:\n${dupes.join('\n')}`).toHaveLength(0);
  });

  it('category and law_type are consistent', () => {
    // law_type が指定されているなら、category がそれに対応する値であること
    const expected: Record<string, string> = {
      Act: 'law',
      CabinetOrder: 'cabinet-order',
      ImperialOrdinance: 'imperial-ordinance',
      MinisterialOrdinance: 'ministerial-ordinance',
      Rule: 'rule',
    };
    for (const e of abbreviationEntries) {
      if (e.law_type && expected[e.law_type]) {
        expect(e.category, `${e.formal}: law_type=${e.law_type} but category=${e.category}`).toBe(
          expected[e.law_type]
        );
      }
    }
  });

  it('constitution entry exists with proper category', () => {
    const constitution = abbreviationEntries.find((e) => e.category === 'constitution');
    expect(constitution).toBeDefined();
    expect(constitution?.formal).toBe('日本国憲法');
    expect(constitution?.law_id).toBe('321CONSTITUTION');
  });

  it('houki-egov entries are the majority (法令系)', () => {
    // v0.2.0: 通達系（houki-nta）が追加されたが、まだ法令系（houki-egov）が主体
    const egov = abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-egov');
    const nta = abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-nta');
    expect(egov.length).toBeGreaterThan(nta.length);
    expect(egov.length).toBeGreaterThan(100); // v0.1.0 時点で 165 件
  });

  it('houki-nta entries exist (v0.2.0 で追加)', () => {
    const nta = abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-nta');
    expect(nta.length).toBeGreaterThan(0);
    // 全て通達系カテゴリ
    for (const e of nta) {
      expect(['kihon-tsutatsu', 'kobetsu-tsutatsu', 'qa-jirei', 'tax-answer']).toContain(
        e.category
      );
    }
  });
});

describe('resolveAbbreviation()', () => {
  it('resolves known abbr', () => {
    const r = resolveAbbreviation('消法');
    expect(r).not.toBeNull();
    expect(r?.formal).toBe('消費税法');
    expect(r?.domain).toBe('tax');
    expect(r?.category).toBe('law');
    expect(r?.source_mcp_hint).toBe('houki-egov');
    expect(r?.law_id).toBe('363AC0000000108');
  });

  it('resolves by formal name', () => {
    const r = resolveAbbreviation('消費税法');
    expect(r?.abbr).toBe('消法');
  });

  it('resolves by alias', () => {
    expect(resolveAbbreviation('消費税')?.formal).toBe('消費税法');
  });

  it('resolves popular 通称 via aliases', () => {
    expect(resolveAbbreviation('景品表示法')?.abbr).toBe('景表法');
    expect(resolveAbbreviation('PL法')?.formal).toBe('製造物責任法');
    expect(resolveAbbreviation('個人情報保護法')?.abbr).toBe('個情法');
    expect(resolveAbbreviation('独占禁止法')?.abbr).toBe('独禁法');
  });

  it('resolves product-development law abbreviations', () => {
    expect(resolveAbbreviation('電子署名法')?.domain).toBe('commercial');
    expect(resolveAbbreviation('資金決済法')?.domain).toBe('commercial');
    expect(resolveAbbreviation('犯収法')?.domain).toBe('commercial');
    expect(resolveAbbreviation('プロ責法')?.domain).toBe('administrative');
    expect(resolveAbbreviation('電波法')?.domain).toBe('administrative');
    expect(resolveAbbreviation('フリーランス新法')?.domain).toBe('labor');
  });

  it('handles whitespace trimming', () => {
    expect(resolveAbbreviation('  消法  ')?.formal).toBe('消費税法');
  });

  it('returns null for unknown names', () => {
    expect(resolveAbbreviation('存在しない法律')).toBeNull();
    expect(resolveAbbreviation('')).toBeNull();
    expect(resolveAbbreviation('   ')).toBeNull();
  });

  it('covers all 6 domains with representative abbreviations', () => {
    expect(resolveAbbreviation('消法')?.domain).toBe('tax');
    expect(resolveAbbreviation('労基法')?.domain).toBe('labor');
    expect(resolveAbbreviation('公認会計士法')?.domain).toBe('accounting');
    expect(resolveAbbreviation('会社')?.domain).toBe('commercial');
    expect(resolveAbbreviation('民')?.domain).toBe('civil');
    expect(resolveAbbreviation('個情法')?.domain).toBe('administrative');
  });

  it('resolves 憲法 as constitution category', () => {
    const r = resolveAbbreviation('憲法');
    expect(r?.formal).toBe('日本国憲法');
    expect(r?.category).toBe('constitution');
  });
});

describe('listByDomain()', () => {
  it('returns only entries with the given domain', () => {
    const taxEntries = listByDomain('tax');
    expect(taxEntries.length).toBeGreaterThan(0);
    for (const e of taxEntries) {
      expect(e.domain).toBe('tax');
    }
  });

  it('all 6 domains return non-empty results', () => {
    for (const d of DOMAINS) {
      expect(listByDomain(d).length, `domain ${d} should have entries`).toBeGreaterThan(0);
    }
  });
});

describe('listByCategory()', () => {
  it('returns only entries with the given category', () => {
    const laws = listByCategory('law');
    expect(laws.length).toBeGreaterThan(0);
    for (const e of laws) {
      expect(e.category).toBe('law');
    }
  });

  it('returns the constitution entry', () => {
    const c = listByCategory('constitution');
    expect(c).toHaveLength(1);
    expect(c[0]?.formal).toBe('日本国憲法');
  });

  it('returns cabinet-order entries', () => {
    const co = listByCategory('cabinet-order');
    expect(co.length).toBeGreaterThan(0);
    expect(co.some((e) => e.formal.endsWith('施行令'))).toBe(true);
  });

  it('returns kihon-tsutatsu entries (v0.2.0 で追加)', () => {
    const kt = listByCategory('kihon-tsutatsu');
    expect(kt.length).toBeGreaterThan(0);
    expect(kt.some((e) => e.formal === '消費税法基本通達')).toBe(true);
  });

  it('returns empty array for not-yet-populated categories', () => {
    expect(listByCategory('hanrei')).toHaveLength(0);
    expect(listByCategory('saiketsu')).toHaveLength(0);
  });
});

describe('listBySourceMcpHint()', () => {
  it('returns houki-egov entries (法令系)', () => {
    const egov = listBySourceMcpHint('houki-egov');
    expect(egov.length).toBeGreaterThan(100);
    for (const e of egov) {
      expect(e.source_mcp_hint).toBe('houki-egov');
    }
  });

  it('returns houki-nta entries (v0.2.0 で追加)', () => {
    const nta = listBySourceMcpHint('houki-nta');
    expect(nta.length).toBeGreaterThan(0);
    expect(nta.some((e) => e.formal === '消費税法基本通達')).toBe(true);
    for (const e of nta) {
      expect(e.source_mcp_hint).toBe('houki-nta');
    }
  });

  it('returns empty array for not-yet-populated hints', () => {
    expect(listBySourceMcpHint('houki-mhlw')).toHaveLength(0);
    expect(listBySourceMcpHint('houki-court')).toHaveLength(0);
  });
});

describe('getAbbreviationStats()', () => {
  it('returns consistent total', () => {
    const s = getAbbreviationStats();
    expect(s.total).toBe(abbreviationEntries.length);
    const sumByDomain = Object.values(s.byDomain).reduce((a, b) => a + b, 0);
    expect(sumByDomain).toBe(s.total);
    const sumByCategory = Object.values(s.byCategory).reduce((a, b) => a + b, 0);
    expect(sumByCategory).toBe(s.total);
    const sumByHint = Object.values(s.bySourceMcpHint).reduce((a, b) => a + b, 0);
    expect(sumByHint).toBe(s.total);
  });

  it('contains all 6 domains in stats', () => {
    const s = getAbbreviationStats();
    for (const d of DOMAINS) {
      expect(s.byDomain[d]).toBeGreaterThan(0);
    }
  });
});

describe('frozen entries', () => {
  it('abbreviationEntries is read-only (frozen)', () => {
    expect(Object.isFrozen(abbreviationEntries)).toBe(true);
  });
});
