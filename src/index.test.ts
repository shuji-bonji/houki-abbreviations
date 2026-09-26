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
  isValidLawId,
  LAW_TYPE_CODES,
  searchByName,
  type AbbreviationEntry,
  type Category,
  type Domain,
  type ResolveAbbreviationOptions,
  type SourceMcpHint,
} from './index.js';
import taxJson from './data/tax.json' with { type: 'json' };
import laborJson from './data/labor.json' with { type: 'json' };
import accountingJson from './data/accounting.json' with { type: 'json' };
import commercialJson from './data/commercial.json' with { type: 'json' };
import civilJson from './data/civil.json' with { type: 'json' };
import administrativeJson from './data/administrative.json' with { type: 'json' };

const VALID_LAW_TYPES = [
  'Act',
  'CabinetOrder',
  'ImperialOrdinance',
  'MinisterialOrdinance',
  'Rule',
] as const;

describe('abbreviation dictionary integrity', () => {
  it('SPEC-ABBR-ABBREVIATION-ENTRIES-001 SPEC-ABBR-GET-ABBREVIATION-STATS-003 SPEC-ABBR-PUBLIC-CONSTANTS-003 has entries across all 6 domains', () => {
    const stats = getAbbreviationStats();
    expect(stats.total).toBeGreaterThan(100);
    for (const d of DOMAINS) {
      expect(stats.byDomain[d], `domain ${d} has zero entries`).toBeGreaterThan(0);
    }
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-002 SPEC-ABBR-PUBLIC-CONSTANTS-002 every entry has required fields (abbr, formal, domain, category, source_mcp_hint)', () => {
    for (const e of abbreviationEntries) {
      expect(e.abbr, JSON.stringify(e)).toBeTruthy();
      expect(e.formal, JSON.stringify(e)).toBeTruthy();
      expect(DOMAINS, JSON.stringify(e)).toContain(e.domain);
      expect(CATEGORIES, JSON.stringify(e)).toContain(e.category);
      expect(SOURCE_MCP_HINTS, JSON.stringify(e)).toContain(e.source_mcp_hint);
    }
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-003 law_id (when set) matches e-Gov format', () => {
    for (const e of abbreviationEntries) {
      if (e.law_id != null) {
        // 判定は isValidLawId に一本化する（テスト側に緩い別パターンを持たない）
        expect(isValidLawId(e.law_id), `${e.formal} has invalid law_id: ${e.law_id}`).toBe(true);
      }
    }
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-004 law_type (when set) is a valid e-Gov type', () => {
    for (const e of abbreviationEntries) {
      if (e.law_type) {
        expect(VALID_LAW_TYPES, JSON.stringify(e)).toContain(e.law_type);
      }
    }
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-005 abbr values are unique across files', () => {
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

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-006 category and law_type are consistent', () => {
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

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-007 constitution entry exists with proper category', () => {
    const constitution = abbreviationEntries.find((e) => e.category === 'constitution');
    expect(constitution).toBeDefined();
    expect(constitution?.formal).toBe('日本国憲法');
    expect(constitution?.law_id).toBe('321CONSTITUTION');
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-008 houki-egov entries are the majority (法令系)', () => {
    // v0.2.0: 通達系（houki-nta）が追加されたが、まだ法令系（houki-egov）が主体
    const egov = abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-egov');
    const nta = abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-nta');
    expect(egov.length).toBeGreaterThan(nta.length);
    expect(egov.length).toBeGreaterThan(100); // v0.1.0 時点で 165 件
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-009 houki-nta entries exist (v0.2.0 で追加)', () => {
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
  it('SPEC-ABBR-RESOLVE-ABBREVIATION-001 resolves known abbr', () => {
    const r = resolveAbbreviation('消法');
    expect(r).not.toBeNull();
    expect(r?.formal).toBe('消費税法');
    expect(r?.domain).toBe('tax');
    expect(r?.category).toBe('law');
    expect(r?.source_mcp_hint).toBe('houki-egov');
    expect(r?.law_id).toBe('363AC0000000108');
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-002 resolves by formal name', () => {
    const r = resolveAbbreviation('消費税法');
    expect(r?.abbr).toBe('消法');
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-003 resolves by alias', () => {
    expect(resolveAbbreviation('消費税')?.formal).toBe('消費税法');
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-003 resolves popular 通称 via aliases', () => {
    expect(resolveAbbreviation('景品表示法')?.abbr).toBe('景表法');
    expect(resolveAbbreviation('PL法')?.formal).toBe('製造物責任法');
    expect(resolveAbbreviation('個人情報保護法')?.abbr).toBe('個情法');
    expect(resolveAbbreviation('独占禁止法')?.abbr).toBe('独禁法');
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-001 resolves product-development law abbreviations', () => {
    expect(resolveAbbreviation('電子署名法')?.domain).toBe('commercial');
    expect(resolveAbbreviation('資金決済法')?.domain).toBe('commercial');
    expect(resolveAbbreviation('犯収法')?.domain).toBe('commercial');
    expect(resolveAbbreviation('プロ責法')?.domain).toBe('administrative');
    expect(resolveAbbreviation('電波法')?.domain).toBe('administrative');
    expect(resolveAbbreviation('フリーランス新法')?.domain).toBe('labor');
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-004 handles whitespace trimming', () => {
    expect(resolveAbbreviation('  消法  ')?.formal).toBe('消費税法');
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-005 returns null for unknown names', () => {
    expect(resolveAbbreviation('存在しない法律')).toBeNull();
    expect(resolveAbbreviation('')).toBeNull();
    expect(resolveAbbreviation('   ')).toBeNull();
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-001 covers all 6 domains with representative abbreviations', () => {
    expect(resolveAbbreviation('消法')?.domain).toBe('tax');
    expect(resolveAbbreviation('労基法')?.domain).toBe('labor');
    expect(resolveAbbreviation('公認会計士法')?.domain).toBe('accounting');
    expect(resolveAbbreviation('会社')?.domain).toBe('commercial');
    expect(resolveAbbreviation('民')?.domain).toBe('civil');
    expect(resolveAbbreviation('個情法')?.domain).toBe('administrative');
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-001 resolves 憲法 as constitution category', () => {
    const r = resolveAbbreviation('憲法');
    expect(r?.formal).toBe('日本国憲法');
    expect(r?.category).toBe('constitution');
  });
});

describe('listByDomain()', () => {
  it('SPEC-ABBR-LIST-BY-DOMAIN-001 returns only entries with the given domain', () => {
    const taxEntries = listByDomain('tax');
    expect(taxEntries.length).toBeGreaterThan(0);
    for (const e of taxEntries) {
      expect(e.domain).toBe('tax');
    }
  });

  it('SPEC-ABBR-LIST-BY-DOMAIN-002 all 6 domains return non-empty results', () => {
    for (const d of DOMAINS) {
      expect(listByDomain(d).length, `domain ${d} should have entries`).toBeGreaterThan(0);
    }
  });
});

describe('listByCategory()', () => {
  it('SPEC-ABBR-LIST-BY-CATEGORY-001 returns only entries with the given category', () => {
    const laws = listByCategory('law');
    expect(laws.length).toBeGreaterThan(0);
    for (const e of laws) {
      expect(e.category).toBe('law');
    }
  });

  it('SPEC-ABBR-LIST-BY-CATEGORY-002 returns the constitution entry', () => {
    const c = listByCategory('constitution');
    expect(c).toHaveLength(1);
    expect(c[0]?.formal).toBe('日本国憲法');
  });

  it('SPEC-ABBR-LIST-BY-CATEGORY-001 returns cabinet-order entries', () => {
    const co = listByCategory('cabinet-order');
    expect(co.length).toBeGreaterThan(0);
    expect(co.some((e) => e.formal.endsWith('施行令'))).toBe(true);
  });

  it('SPEC-ABBR-LIST-BY-CATEGORY-001 returns kihon-tsutatsu entries (v0.2.0 で追加)', () => {
    const kt = listByCategory('kihon-tsutatsu');
    expect(kt.length).toBeGreaterThan(0);
    expect(kt.some((e) => e.formal === '消費税法基本通達')).toBe(true);
  });

  it('SPEC-ABBR-LIST-BY-CATEGORY-003 returns empty array for not-yet-populated categories', () => {
    expect(listByCategory('hanrei')).toHaveLength(0);
    expect(listByCategory('saiketsu')).toHaveLength(0);
  });
});

describe('listBySourceMcpHint()', () => {
  it('SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-001 returns houki-egov entries (法令系)', () => {
    const egov = listBySourceMcpHint('houki-egov');
    expect(egov.length).toBeGreaterThan(100);
    for (const e of egov) {
      expect(e.source_mcp_hint).toBe('houki-egov');
    }
  });

  it('SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-001 returns houki-nta entries (v0.2.0 で追加)', () => {
    const nta = listBySourceMcpHint('houki-nta');
    expect(nta.length).toBeGreaterThan(0);
    expect(nta.some((e) => e.formal === '消費税法基本通達')).toBe(true);
    for (const e of nta) {
      expect(e.source_mcp_hint).toBe('houki-nta');
    }
  });

  it('SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-002 returns empty array for not-yet-populated hints', () => {
    expect(listBySourceMcpHint('houki-mhlw')).toHaveLength(0);
    expect(listBySourceMcpHint('houki-court')).toHaveLength(0);
  });
});

describe('getAbbreviationStats()', () => {
  it('SPEC-ABBR-GET-ABBREVIATION-STATS-001 SPEC-ABBR-GET-ABBREVIATION-STATS-002 returns consistent total', () => {
    const s = getAbbreviationStats();
    expect(s.total).toBe(abbreviationEntries.length);
    const sumByDomain = Object.values(s.byDomain).reduce((a, b) => a + b, 0);
    expect(sumByDomain).toBe(s.total);
    const sumByCategory = Object.values(s.byCategory).reduce((a, b) => a + b, 0);
    expect(sumByCategory).toBe(s.total);
    const sumByHint = Object.values(s.bySourceMcpHint).reduce((a, b) => a + b, 0);
    expect(sumByHint).toBe(s.total);
  });

  it('SPEC-ABBR-GET-ABBREVIATION-STATS-003 SPEC-ABBR-PUBLIC-CONSTANTS-003 contains all 6 domains in stats', () => {
    const s = getAbbreviationStats();
    for (const d of DOMAINS) {
      expect(s.byDomain[d]).toBeGreaterThan(0);
    }
  });
});

describe('frozen entries', () => {
  it('SPEC-ABBR-ABBREVIATION-ENTRIES-010 abbreviationEntries is read-only (frozen)', () => {
    expect(Object.isFrozen(abbreviationEntries)).toBe(true);
  });
});

describe('resolveAbbreviation() 追加の振る舞い', () => {
  it('SPEC-ABBR-RESOLVE-ABBREVIATION-010 既定の照合でも前後の全角空白・タブ・改行を除く', () => {
    for (const input of ['\u3000消法\u3000', '\t消法\n', '\r\n消法\u3000\t']) {
      expect(resolveAbbreviation(input)?.formal, JSON.stringify(input)).toBe('消費税法');
    }
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-011 normalize: false・空のオブジェクト・null・undefined の options は省いたときと同じ', () => {
    const base = resolveAbbreviation('消法');
    expect(base?.formal).toBe('消費税法');
    const variants = [
      { normalize: false },
      {},
      null as unknown as ResolveAbbreviationOptions,
      undefined,
    ];
    for (const opts of variants) {
      expect(resolveAbbreviation('消法', opts), JSON.stringify(opts)).toBe(base);
      expect(resolveAbbreviation('ＰＬ法', opts), JSON.stringify(opts)).toBeNull();
    }
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-012 normalize: true でも別名からエントリを返す', () => {
    expect(resolveAbbreviation('消費税', { normalize: true })).toBe(resolveAbbreviation('消費税'));
    expect(resolveAbbreviation('消費税', { normalize: true })?.abbr).toBe('消法');
    expect(resolveAbbreviation('インボイス', { normalize: true })?.abbr).toBe('消法');
    const aml = resolveAbbreviation('ＡＭＬ', { normalize: true });
    expect(aml?.abbr).toBe('犯収法');
    expect(aml?.aliases).toContain('AML');
    const jpki = resolveAbbreviation('ＪＰＫＩ法', { normalize: true });
    expect(jpki?.abbr).toBe('公的個人認証法');
    expect(jpki?.aliases).toContain('JPKI法');
  });

  it('SPEC-ABBR-RESOLVE-ABBREVIATION-013 name が null・undefined のときは null を返す', () => {
    const nullName = null as unknown as string;
    const undefinedName = undefined as unknown as string;
    expect(resolveAbbreviation(nullName)).toBeNull();
    expect(resolveAbbreviation(undefinedName)).toBeNull();
    expect(resolveAbbreviation(nullName, { normalize: true })).toBeNull();
    expect(resolveAbbreviation(undefinedName, { normalize: true })).toBeNull();
  });
});

describe('listByCategory() 追加の振る舞い', () => {
  it('SPEC-ABBR-LIST-BY-CATEGORY-004 辞書の並びのまま返す', () => {
    for (const c of CATEGORIES) {
      expect(listByCategory(c), c).toEqual(abbreviationEntries.filter((e) => e.category === c));
    }
    expect(
      listByCategory('law')
        .slice(0, 3)
        .map((e) => e.abbr)
    ).toEqual(['所法', '法法', '消法']);
    expect(
      listByCategory('kihon-tsutatsu')
        .slice(0, 3)
        .map((e) => e.abbr)
    ).toEqual(['消基通', '所基通', '法基通']);
  });

  it('SPEC-ABBR-LIST-BY-CATEGORY-005 呼ぶたびに新しい配列を返す', () => {
    const expected = abbreviationEntries.filter((e) => e.category === 'law').length;
    const a = listByCategory('law');
    expect(listByCategory('law')).not.toBe(a);
    a.push({} as AbbreviationEntry);
    expect(listByCategory('law')).toHaveLength(expected);
    a.splice(0);
    expect(listByCategory('law')).toHaveLength(expected);
  });

  it('SPEC-ABBR-LIST-BY-CATEGORY-006 CATEGORIES に無い値には空配列を返す', () => {
    expect(listByCategory('xxx' as Category)).toEqual([]);
    expect(listByCategory(undefined as unknown as Category)).toEqual([]);
  });

  it('SPEC-ABBR-LIST-BY-CATEGORY-007 ministerial-ordinance・rule・kobetsu-tsutatsu にもその種別のエントリを返す', () => {
    const mo = listByCategory('ministerial-ordinance');
    expect(mo.length).toBeGreaterThan(0);
    expect(mo.find((e) => e.abbr === '所規')?.formal).toBe('所得税法施行規則');
    expect(mo.map((e) => e.abbr)).toEqual(expect.arrayContaining(['所規', '労基則', '会社規']));

    const rule = listByCategory('rule');
    expect(rule.find((e) => e.abbr === '民訴規')?.formal).toBe('民事訴訟規則');
    expect(rule.find((e) => e.abbr === '刑訴規')?.formal).toBe('刑事訴訟規則');

    const kobetsu = listByCategory('kobetsu-tsutatsu');
    expect(kobetsu.find((e) => e.abbr === '電帳法取通')?.formal).toBe(
      '電子計算機を使用して作成する国税関係帳簿書類の保存方法等の特例に関する法律の取扱通達'
    );

    for (const [c, list] of [
      ['ministerial-ordinance', mo],
      ['rule', rule],
      ['kobetsu-tsutatsu', kobetsu],
    ] as const) {
      for (const e of list) {
        expect(e.category, e.abbr).toBe(c);
      }
    }
  });
});

describe('listByDomain() 追加の振る舞い', () => {
  it('SPEC-ABBR-LIST-BY-DOMAIN-003 辞書の並びのまま返す', () => {
    for (const d of DOMAINS) {
      expect(listByDomain(d), d).toEqual(abbreviationEntries.filter((e) => e.domain === d));
    }
    expect(
      listByDomain('tax')
        .slice(0, 3)
        .map((e) => e.abbr)
    ).toEqual(['所法', '所令', '所規']);
    expect(
      listByDomain('labor')
        .slice(0, 3)
        .map((e) => e.abbr)
    ).toEqual(['労基法', '労基則', '労契法']);
  });

  it('SPEC-ABBR-LIST-BY-DOMAIN-004 呼ぶたびに新しい配列を返す', () => {
    const expected = abbreviationEntries.filter((e) => e.domain === 'tax').length;
    const a = listByDomain('tax');
    expect(listByDomain('tax')).not.toBe(a);
    a.push({} as AbbreviationEntry);
    expect(listByDomain('tax')).toHaveLength(expected);
    a.splice(0);
    expect(listByDomain('tax')).toHaveLength(expected);
  });

  it('SPEC-ABBR-LIST-BY-DOMAIN-005 DOMAINS に無い値には空配列を返す', () => {
    expect(listByDomain('xxx' as Domain)).toEqual([]);
    expect(listByDomain('' as Domain)).toEqual([]);
  });
});

describe('listBySourceMcpHint() 追加の振る舞い', () => {
  it('SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-002 houki-jaish と houki-saiketsu にも空配列を返す', () => {
    expect(listBySourceMcpHint('houki-jaish')).toEqual([]);
    expect(listBySourceMcpHint('houki-saiketsu')).toEqual([]);
  });

  it('SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-003 辞書の並びのまま返す', () => {
    for (const h of SOURCE_MCP_HINTS) {
      expect(listBySourceMcpHint(h), h).toEqual(
        abbreviationEntries.filter((e) => e.source_mcp_hint === h)
      );
    }
    expect(
      listBySourceMcpHint('houki-egov')
        .slice(0, 3)
        .map((e) => e.abbr)
    ).toEqual(['所法', '所令', '所規']);
    expect(
      listBySourceMcpHint('houki-nta')
        .slice(0, 3)
        .map((e) => e.abbr)
    ).toEqual(['消基通', '所基通', '法基通']);
  });

  it('SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-004 呼ぶたびに新しい配列を返す', () => {
    const expected = abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-nta').length;
    const a = listBySourceMcpHint('houki-nta');
    expect(listBySourceMcpHint('houki-nta')).not.toBe(a);
    a.push({} as AbbreviationEntry);
    expect(listBySourceMcpHint('houki-nta')).toHaveLength(expected);
    a.splice(0);
    expect(listBySourceMcpHint('houki-nta')).toHaveLength(expected);
  });

  it('SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-005 SOURCE_MCP_HINTS に無い値には空配列を返す', () => {
    expect(listBySourceMcpHint('xxx' as SourceMcpHint)).toEqual([]);
    expect(listBySourceMcpHint('HOUKI-EGOV' as SourceMcpHint)).toEqual([]);
  });
});

describe('getAbbreviationStats() 追加の振る舞い', () => {
  it('SPEC-ABBR-GET-ABBREVIATION-STATS-004 呼ぶたびに新しいオブジェクトを返す', () => {
    const expectedTotal = abbreviationEntries.length;
    const expectedTax = abbreviationEntries.filter((e) => e.domain === 'tax').length;
    const expectedLaw = abbreviationEntries.filter((e) => e.category === 'law').length;

    const s = getAbbreviationStats();
    const t = getAbbreviationStats();
    expect(t).not.toBe(s);
    expect(t.byDomain).not.toBe(s.byDomain);
    expect(t.byCategory).not.toBe(s.byCategory);
    expect(t.bySourceMcpHint).not.toBe(s.bySourceMcpHint);

    s.total = 0;
    s.byDomain.tax = 0;
    s.byCategory.law = 0;
    s.bySourceMcpHint['houki-egov'] = 0;

    const u = getAbbreviationStats();
    expect(u.total).toBe(expectedTotal);
    expect(u.byDomain.tax).toBe(expectedTax);
    expect(u.byCategory.law).toBe(expectedLaw);
    expect(u.bySourceMcpHint['houki-egov']).toBe(
      abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-egov').length
    );
  });
});

const DOMAIN_FILES: ReadonlyArray<readonly [string, readonly Record<string, unknown>[]]> = [
  ['tax', taxJson],
  ['labor', laborJson],
  ['accounting', accountingJson],
  ['commercial', commercialJson],
  ['civil', civilJson],
  ['administrative', administrativeJson],
];

describe('abbreviationEntries 追加の振る舞い', () => {
  it('SPEC-ABBR-ABBREVIATION-ENTRIES-012 分野の JSON ファイルの順に結合し、ファイルの中の順を保って並ぶ', () => {
    const expected = DOMAIN_FILES.flatMap(([, entries]) => entries.map((e) => e.abbr));
    expect(abbreviationEntries.map((e) => e.abbr)).toEqual(expected);
    expect(abbreviationEntries[0]?.abbr).toBe('所法');
    expect(abbreviationEntries.findIndex((e) => e.domain === 'labor')).toBe(taxJson.length);
    expect(abbreviationEntries[taxJson.length]?.abbr).toBe('労基法');
    expect(abbreviationEntries.at(-1)?.abbr).toBe('デジ庁設置法');
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-012 searchByName の返す順は辞書の並びに従う', () => {
    const result = searchByName('基通').map((e) => e.abbr);
    expect(result).toEqual(expect.arrayContaining(['消基通', '所基通', '法基通']));
    const indices = result.map((abbr) => abbreviationEntries.findIndex((e) => e.abbr === abbr));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(result.slice(0, 3)).toEqual(['消基通', '所基通', '法基通']);
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-013 全エントリが law_id のキーを持ち、値は文字列か null である', () => {
    for (const e of abbreviationEntries) {
      expect(Object.hasOwn(e, 'law_id'), e.abbr).toBe(true);
      expect(e.law_id === null || typeof e.law_id === 'string', e.abbr).toBe(true);
    }
    expect(resolveAbbreviation('所法')?.law_id).toBe('340AC0000000033');
    expect(resolveAbbreviation('消基通')?.law_id).toBeNull();
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-014 各エントリの domain は、そのエントリが書かれた JSON ファイルの名前と同じである', () => {
    for (const [domain, entries] of DOMAIN_FILES) {
      for (const e of entries) {
        expect(e.domain, `${domain}.json: ${String(e.abbr)}`).toBe(domain);
      }
    }
    expect(resolveAbbreviation('電帳法取通')?.domain).toBe('tax');
    expect(resolveAbbreviation('憲')?.domain).toBe('administrative');
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-015 houki-nta 管轄のエントリは law_id が null である', () => {
    const nta = abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-nta');
    expect(nta.length).toBeGreaterThan(0);
    for (const e of nta) {
      expect(e.law_id, e.abbr).toBeNull();
    }
    for (const abbr of ['消基通', '措通', '電帳法取通']) {
      expect(resolveAbbreviation(abbr)?.law_id, abbr).toBeNull();
    }
  });

  it('SPEC-ABBR-ABBREVIATION-ENTRIES-016 houki-egov 管轄のエントリは法令系のカテゴリだけである', () => {
    const allowed = [
      'constitution',
      'law',
      'cabinet-order',
      'imperial-ordinance',
      'ministerial-ordinance',
      'rule',
    ];
    const egov = abbreviationEntries.filter((e) => e.source_mcp_hint === 'houki-egov');
    expect(egov.length).toBeGreaterThan(0);
    for (const e of egov) {
      expect(allowed, e.abbr).toContain(e.category);
    }
    expect(resolveAbbreviation('憲')?.category).toBe('constitution');
    expect(resolveAbbreviation('所法')?.category).toBe('law');
  });
});

describe('公開定数 追加の振る舞い', () => {
  it('SPEC-ABBR-PUBLIC-CONSTANTS-004 LAW_TYPE_CODES は 5 つの法令種別と種別コードの対応を持つ', () => {
    expect({ ...LAW_TYPE_CODES }).toEqual({
      Act: 'AC',
      CabinetOrder: 'CO',
      ImperialOrdinance: 'IO',
      MinisterialOrdinance: 'MO',
      Rule: 'RU',
    });
    expect(Object.keys(LAW_TYPE_CODES)).toHaveLength(5);
  });

  it('SPEC-ABBR-PUBLIC-CONSTANTS-005 law_id と law_type の両方を持つエントリは、law_id の種別コードが LAW_TYPE_CODES と一致する', () => {
    const targets = abbreviationEntries.filter((e) => e.law_id != null && e.law_type);
    expect(targets.length).toBeGreaterThan(0);
    for (const e of targets) {
      if (e.law_id == null || !e.law_type) continue;
      expect(e.law_id.slice(3, 5), `${e.abbr}: ${e.law_id}`).toBe(LAW_TYPE_CODES[e.law_type]);
    }
    const shohou = resolveAbbreviation('消法');
    expect(shohou?.law_id).toBe('363AC0000000108');
    expect(shohou?.law_type).toBe('Act');
    expect(targets.some((e) => e.abbr === '憲')).toBe(false);
  });

  it('SPEC-ABBR-PUBLIC-CONSTANTS-006 DOMAINS は 6 つの値をこの順で持つ', () => {
    expect([...DOMAINS]).toEqual([
      'tax',
      'labor',
      'accounting',
      'commercial',
      'civil',
      'administrative',
    ]);
  });

  it('SPEC-ABBR-PUBLIC-CONSTANTS-007 CATEGORIES は 12 の値をこの順で持つ', () => {
    expect([...CATEGORIES]).toEqual([
      'constitution',
      'law',
      'cabinet-order',
      'imperial-ordinance',
      'ministerial-ordinance',
      'rule',
      'kihon-tsutatsu',
      'kobetsu-tsutatsu',
      'qa-jirei',
      'tax-answer',
      'hanrei',
      'saiketsu',
    ]);
  });

  it('SPEC-ABBR-PUBLIC-CONSTANTS-008 SOURCE_MCP_HINTS は 6 つの値をこの順で持つ', () => {
    expect([...SOURCE_MCP_HINTS]).toEqual([
      'houki-egov',
      'houki-nta',
      'houki-mhlw',
      'houki-jaish',
      'houki-court',
      'houki-saiketsu',
    ]);
  });
});
