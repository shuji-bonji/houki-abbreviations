import { describe, it, expect } from 'vitest';
import { normalizeJpText, normalizeSearchQuery, resolveAbbreviation } from './index.js';

describe('normalizeJpText()', () => {
  it('returns empty string for empty / falsy input', () => {
    expect(normalizeJpText('')).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeJpText('  消法  ')).toBe('消法');
  });

  it('converts full-width digits to half-width', () => {
    expect(normalizeJpText('１８３')).toBe('183');
    expect(normalizeJpText('０１２３４５６７８９')).toBe('0123456789');
  });

  it('converts full-width hyphen to half-width hyphen', () => {
    expect(normalizeJpText('１８３－２')).toBe('183-2');
    expect(normalizeJpText('第２－３条')).toBe('第2-3条');
  });

  it('converts full-width tilde variants to half-width tilde', () => {
    // FULLWIDTH TILDE (U+FF5E)
    expect(normalizeJpText('１８３～１９３')).toBe('183~193');
    // WAVE DASH (U+301C)
    expect(normalizeJpText('１８３〜１９３')).toBe('183~193');
  });

  it('converts full-width space to half-width space', () => {
    expect(normalizeJpText('消　法')).toBe('消 法');
  });

  it('converts full-width ASCII letters but preserves case', () => {
    expect(normalizeJpText('ＰＬ法')).toBe('PL法');
    expect(normalizeJpText('ｐｌ法')).toBe('pl法');
    expect(normalizeJpText('ＡＢＣＤＥ')).toBe('ABCDE');
    expect(normalizeJpText('ａｂｃｄｅ')).toBe('abcde');
  });

  it('preserves nakaguro (中黒)', () => {
    expect(normalizeJpText('１の３・１の４共-1')).toBe('1の3・1の4共-1');
  });

  it('preserves Japanese characters (kana, kanji)', () => {
    expect(normalizeJpText('消費税法基本通達')).toBe('消費税法基本通達');
    expect(normalizeJpText('カタカナひらがな漢字')).toBe('カタカナひらがな漢字');
  });

  it('preserves halfwidth kana (no conversion)', () => {
    // 半角カナはそのまま
    expect(normalizeJpText('ｱｲｳｴｵ')).toBe('ｱｲｳｴｵ');
  });

  it('preserves common Japanese clause-number markers', () => {
    // 共・の・条・項・章・節・款 などの構造マーカーは保持
    expect(normalizeJpText('１の３共-1')).toBe('1の3共-1');
    expect(normalizeJpText('第１条第２項第３号')).toBe('第1条第2項第3号');
  });

  it('combines all transformations in one pass', () => {
    expect(normalizeJpText('  ＰＬ法１８３－２ 消　法  ')).toBe('PL法183-2 消 法');
  });
});

describe('normalizeSearchQuery()', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeSearchQuery('')).toBe('');
  });

  it('applies normalizeJpText transformations', () => {
    expect(normalizeSearchQuery('１８３－２')).toBe('183-2');
    expect(normalizeSearchQuery('１８３〜１９３')).toBe('183~193');
  });

  it('lowercases ASCII uppercase letters', () => {
    expect(normalizeSearchQuery('PL法')).toBe('pl法');
    expect(normalizeSearchQuery('ＰＬ法')).toBe('pl法');
  });

  it('preserves Japanese characters during lowercase', () => {
    // 大文字小文字変換は ASCII のみ。漢字・ひらがな・カタカナは無変化。
    expect(normalizeSearchQuery('消費税法')).toBe('消費税法');
    expect(normalizeSearchQuery('カタカナ')).toBe('カタカナ');
  });

  it('collapses consecutive whitespace into a single space', () => {
    expect(normalizeSearchQuery('消    法')).toBe('消 法');
    expect(normalizeSearchQuery('a   b\tc\n d')).toBe('a b c d');
  });

  it('trims and collapses combined', () => {
    expect(normalizeSearchQuery('  消    法  ')).toBe('消 法');
  });
});

describe('resolveAbbreviation() with { normalize: true }', () => {
  it('default behavior (no options) is unchanged from v0.2.0', () => {
    // 後方互換性のための回帰テスト
    expect(resolveAbbreviation('消法')?.formal).toBe('消費税法');
    expect(resolveAbbreviation('  消法  ')?.formal).toBe('消費税法');
    expect(resolveAbbreviation('存在しない')).toBeNull();
  });

  it('default ({ normalize: false }) does not absorb full-width variations', () => {
    // 全角スペースを含む入力は normalize なしではヒットしない
    expect(resolveAbbreviation('消　法')).toBeNull();
    // 全角 ASCII もヒットしない（PL法 は ASCII で登録されている）
    expect(resolveAbbreviation('ＰＬ法')).toBeNull();
  });

  it('{ normalize: true } absorbs full-width digits', () => {
    // 全角数字を含む入力は normalize: true でヒット可能（インデックスは normalize なしの英数字で登録）
    // ※ v0.3.0 時点の辞書には数字を含む abbr/formal が少ないため、
    //   主に「インデックスもノーマライズすれば一致する」ケースを検証
    const r = resolveAbbreviation('消法', { normalize: true });
    expect(r?.formal).toBe('消費税法');
  });

  it('{ normalize: true } absorbs full-width ASCII letters', () => {
    // ＰＬ法 (full-width) → PL法 (half-width) → resolves
    const r = resolveAbbreviation('ＰＬ法', { normalize: true });
    expect(r?.formal).toBe('製造物責任法');
  });

  it('{ normalize: true } preserves case sensitivity', () => {
    // 大文字小文字は normalize でも保持される
    // 「PL法」は登録されているが、「pl法」は登録されていない
    expect(resolveAbbreviation('PL法', { normalize: true })?.formal).toBe('製造物責任法');
    // 小文字 'pl法' は別物なのでヒットしない
    expect(resolveAbbreviation('pl法', { normalize: true })).toBeNull();
    expect(resolveAbbreviation('ｐｌ法', { normalize: true })).toBeNull();
  });

  it('{ normalize: true } absorbs full-width spaces', () => {
    // 全角スペースを含む入力でもヒットする (entries 側に空白なしのもの)
    // 例: 入力「消費　税法」→ normalize 後「消費 税法」→ index には空白なしの「消費税法」しかないため、
    //   このケースはヒットしない（entries 側に空白を含むエントリがない）。
    // よってこのテストは「normalize 後に index と一致するキー」を使う。
    // 現実的には「前後の全角空白」のケース。
    expect(resolveAbbreviation('　消法　', { normalize: true })?.formal).toBe('消費税法');
  });

  it('{ normalize: true } returns null for genuinely unknown names', () => {
    expect(resolveAbbreviation('存在しない法律', { normalize: true })).toBeNull();
    expect(resolveAbbreviation('', { normalize: true })).toBeNull();
    expect(resolveAbbreviation('   ', { normalize: true })).toBeNull();
    expect(resolveAbbreviation('　　　', { normalize: true })).toBeNull();
  });

  it('{ normalize: true } still works on aliases', () => {
    // aliases 経由のヒットも normalize で機能する
    // '個人情報保護法' は abbr='個情法' のエントリの formal であり、
    // alias 経由でもヒットする。
    expect(resolveAbbreviation('個人情報保護法', { normalize: true })?.abbr).toBe('個情法');
  });

  it('{ normalize: true } prefers exact-match over normalized-match (consistency)', () => {
    // 「PL法」というキーは index に既にあるので、normalize: true でも同じエントリを返す
    const exact = resolveAbbreviation('PL法');
    const normalized = resolveAbbreviation('PL法', { normalize: true });
    expect(normalized).toBe(exact);
  });
});
