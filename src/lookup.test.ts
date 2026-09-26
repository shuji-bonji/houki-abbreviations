/**
 * Tests for src/lookup.ts (v0.5.0)
 */

import { describe, expect, it } from 'vitest';
import type { AbbreviationEntry } from './types.js';
import { lookupByLawId, lookupByLawNum, getAllNames } from './lookup.js';

const fixtures: AbbreviationEntry[] = [
  {
    abbr: '消法',
    formal: '消費税法',
    law_id: '363AC0000000108',
    law_num: '昭和六十三年法律第百八号',
    domain: 'tax',
    category: 'law',
    source_mcp_hint: 'houki-egov',
    aliases: ['消費税', 'インボイス', 'インボイス制度'],
  },
  {
    abbr: '憲',
    formal: '日本国憲法',
    law_id: '321CONSTITUTION',
    law_num: '昭和二十一年憲法',
    domain: 'administrative',
    category: 'constitution',
    source_mcp_hint: 'houki-egov',
  },
  {
    abbr: '労基法',
    formal: '労働基準法',
    law_id: null,
    domain: 'labor',
    category: 'law',
    source_mcp_hint: 'houki-egov',
    aliases: ['労基'],
  },
];

describe('lookupByLawId', () => {
  it('SPEC-ABBR-LOOKUP-BY-LAW-ID-001 verified law_id でエントリを引ける', () => {
    expect(lookupByLawId(fixtures, '363AC0000000108')?.formal).toBe('消費税法');
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-ID-001 CONSTITUTION 形式でも引ける', () => {
    expect(lookupByLawId(fixtures, '321CONSTITUTION')?.formal).toBe('日本国憲法');
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-ID-004 law_id=null のエントリはヒットしない', () => {
    // null と照合しても返さない
    expect(lookupByLawId(fixtures, '')).toBeNull();
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-ID-003 存在しない law_id は null', () => {
    expect(lookupByLawId(fixtures, '999XX0000000000')).toBeNull();
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-ID-002 前後空白は trim される', () => {
    expect(lookupByLawId(fixtures, '  363AC0000000108  ')?.formal).toBe('消費税法');
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-ID-004 空文字 / 空白のみは null', () => {
    expect(lookupByLawId(fixtures, '')).toBeNull();
    expect(lookupByLawId(fixtures, '   ')).toBeNull();
  });
});

describe('lookupByLawNum', () => {
  it('SPEC-ABBR-LOOKUP-BY-LAW-NUM-001 漢数字の law_num でエントリを引ける', () => {
    expect(lookupByLawNum(fixtures, '昭和六十三年法律第百八号')?.formal).toBe('消費税法');
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-NUM-002 SPEC-ABBR-LOOKUP-BY-LAW-NUM-003 算用数字・全角数字・位ごとの漢数字でも引ける (v0.6.0 から normalizeLawNum で照合)', () => {
    expect(lookupByLawNum(fixtures, '昭和63年法律第108号')?.formal).toBe('消費税法');
    expect(lookupByLawNum(fixtures, '昭和６３年法律第１０８号')?.formal).toBe('消費税法');
    expect(lookupByLawNum(fixtures, '昭和六三年法律第一〇八号')?.formal).toBe('消費税法');
    expect(lookupByLawNum(fixtures, ' 昭和63年 法律 第108号 ')?.formal).toBe('消費税法');
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-NUM-004 第・号を省いた形や別の元号は引けない', () => {
    expect(lookupByLawNum(fixtures, '昭和63年法律108号')).toBeNull();
    expect(lookupByLawNum(fixtures, '平成63年法律第108号')).toBeNull();
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-NUM-006 law_num 未設定エントリは引けない', () => {
    expect(lookupByLawNum(fixtures, '')).toBeNull();
  });

  it('SPEC-ABBR-LOOKUP-BY-LAW-NUM-005 存在しない law_num は null', () => {
    expect(lookupByLawNum(fixtures, '令和九十九年法律第千号')).toBeNull();
  });
});

describe('getAllNames', () => {
  it('SPEC-ABBR-GET-ALL-NAMES-001 abbr から全別表記を取得', () => {
    const names = getAllNames(fixtures, '消法');
    expect(names).toEqual(['消法', '消費税法', '消費税', 'インボイス', 'インボイス制度']);
  });

  it('SPEC-ABBR-GET-ALL-NAMES-002 formal からも同じ結果', () => {
    expect(getAllNames(fixtures, '消費税法')).toEqual(getAllNames(fixtures, '消法'));
  });

  it('SPEC-ABBR-GET-ALL-NAMES-002 alias からも同じ結果', () => {
    expect(getAllNames(fixtures, 'インボイス')).toEqual(getAllNames(fixtures, '消法'));
  });

  it('SPEC-ABBR-GET-ALL-NAMES-003 aliases が無いエントリでも abbr+formal だけ返す', () => {
    expect(getAllNames(fixtures, '憲')).toEqual(['憲', '日本国憲法']);
  });

  it('SPEC-ABBR-GET-ALL-NAMES-004 見つからなければ空配列', () => {
    expect(getAllNames(fixtures, '存在しない')).toEqual([]);
  });

  it('SPEC-ABBR-GET-ALL-NAMES-005 空文字は空配列', () => {
    expect(getAllNames(fixtures, '')).toEqual([]);
    expect(getAllNames(fixtures, '   ')).toEqual([]);
  });

  it('SPEC-ABBR-GET-ALL-NAMES-001 順序は abbr → formal → aliases (重複除去後)', () => {
    const names = getAllNames(fixtures, '労基法');
    expect(names).toEqual(['労基法', '労働基準法', '労基']);
  });
});
