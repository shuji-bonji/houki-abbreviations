/**
 * Tests for src/freshness.ts (v0.4.1 / Issue #15)
 *
 * 純関数レベルの単体テスト。
 */

import { describe, expect, it } from 'vitest';
import { STALENESS_THRESHOLDS, computeDaysSince, judgeStaleness } from './freshness.js';

describe('STALENESS_THRESHOLDS', () => {
  it('SPEC-ABBR-PUBLIC-CONSTANTS-001 fresh_days と stale_days が 7 / 30 で固定されている (家族共通の慣行)', () => {
    expect(STALENESS_THRESHOLDS.fresh_days).toBe(7);
    expect(STALENESS_THRESHOLDS.stale_days).toBe(30);
  });

  it('SPEC-ABBR-PUBLIC-CONSTANTS-001 fresh_days < stale_days', () => {
    expect(STALENESS_THRESHOLDS.fresh_days).toBeLessThan(STALENESS_THRESHOLDS.stale_days);
  });
});

describe('judgeStaleness', () => {
  it('SPEC-ABBR-JUDGE-STALENESS-001 0 日 → fresh', () => {
    expect(judgeStaleness(0)).toBe('fresh');
  });

  it('SPEC-ABBR-JUDGE-STALENESS-001 6 日 → fresh (境界 fresh_days=7 未満)', () => {
    expect(judgeStaleness(6)).toBe('fresh');
  });

  it('SPEC-ABBR-JUDGE-STALENESS-002 7 日 → stale (境界 fresh_days と一致は stale)', () => {
    expect(judgeStaleness(7)).toBe('stale');
  });

  it('SPEC-ABBR-JUDGE-STALENESS-002 29 日 → stale (境界 stale_days=30 未満)', () => {
    expect(judgeStaleness(29)).toBe('stale');
  });

  it('SPEC-ABBR-JUDGE-STALENESS-003 30 日 → outdated (境界 stale_days と一致は outdated)', () => {
    expect(judgeStaleness(30)).toBe('outdated');
  });

  it('SPEC-ABBR-JUDGE-STALENESS-003 100 日 → outdated', () => {
    expect(judgeStaleness(100)).toBe('outdated');
  });
});

describe('computeDaysSince', () => {
  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-001 同一時刻なら 0', () => {
    const t = '2026-05-08T00:00:00Z';
    const nowMs = Date.parse(t);
    expect(computeDaysSince(t, nowMs)).toBe(0);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-001 1 日前なら 1', () => {
    const fetched = '2026-05-07T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    expect(computeDaysSince(fetched, Date.parse(now))).toBe(1);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-001 14 日前なら 14', () => {
    const fetched = '2026-04-24T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    expect(computeDaysSince(fetched, Date.parse(now))).toBe(14);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-001 小数日 (12 時間) は floor で 0', () => {
    const fetched = '2026-05-07T12:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    expect(computeDaysSince(fetched, Date.parse(now))).toBe(0);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-002 未来時刻 (now < fetched) は 0 に丸める', () => {
    const fetched = '2026-06-01T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    expect(computeDaysSince(fetched, Date.parse(now))).toBe(0);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-003 パース不能な文字列は 0', () => {
    // 20261001-input-guards: 0 を返さず RangeError を投げる
    const nowMs = Date.parse('2026-05-08T00:00:00Z');
    expect(() => computeDaysSince('not-a-date', nowMs)).toThrow(RangeError);
    expect(() => computeDaysSince('', nowMs)).toThrow(RangeError);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-004 nowMs 省略時はシステム時刻 (sanity check のみ)', () => {
    const nearFuture = new Date(Date.now() + 5 * 60_000).toISOString();
    expect(computeDaysSince(nearFuture)).toBe(0);
  });
});

describe('judgeStaleness × computeDaysSince の組合せ (典型シナリオ)', () => {
  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-001 SPEC-ABBR-JUDGE-STALENESS-001 1 週間以内に fetch したデータは fresh', () => {
    const fetched = '2026-05-04T00:00:00Z'; // 4 日前
    const now = '2026-05-08T00:00:00Z';
    const days = computeDaysSince(fetched, Date.parse(now));
    expect(judgeStaleness(days)).toBe('fresh');
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-001 SPEC-ABBR-JUDGE-STALENESS-002 2 週間前に fetch したデータは stale', () => {
    const fetched = '2026-04-24T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    const days = computeDaysSince(fetched, Date.parse(now));
    expect(judgeStaleness(days)).toBe('stale');
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-001 SPEC-ABBR-JUDGE-STALENESS-003 2 ヶ月前に fetch したデータは outdated', () => {
    const fetched = '2026-03-08T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    const days = computeDaysSince(fetched, Date.parse(now));
    expect(judgeStaleness(days)).toBe('outdated');
  });
});

describe('judgeStaleness（小数の日数）', () => {
  it('SPEC-ABBR-JUDGE-STALENESS-004 小数の日数も丸めずに境界と「未満」で比べる', () => {
    expect(judgeStaleness(6.99)).toBe('fresh');
    expect(judgeStaleness(29.5)).toBe('stale');
    expect(judgeStaleness(29.999)).toBe('stale');
    expect(judgeStaleness(30.0)).toBe('outdated');
  });
});

/* -------------------------------------------------------------------------- */
/* 20261001-input-guards                                                      */
/* -------------------------------------------------------------------------- */

const NOW_MS = Date.parse('2026-05-08T00:00:00Z');

/** 型に合わない値を渡すための cast */
const asString = (v: unknown): string => v as string;
const asNumber = (v: unknown): number => v as number;

describe('computeDaysSince — 20261001-input-guards', () => {
  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-005 日付だけ・UTC・時差付きの 3 つの形を受け付け、日付だけは UTC の 0 時として扱う', () => {
    expect(computeDaysSince('2026-05-07', NOW_MS)).toBe(1);
    expect(computeDaysSince('2026-05-07T00:00:00.000Z', NOW_MS)).toBe(1);
    expect(computeDaysSince('2026-05-07T00:00:00Z', NOW_MS)).toBe(1);
    expect(computeDaysSince('2026-05-08T09:00:00+09:00', NOW_MS)).toBe(0);
    expect(computeDaysSince('2026-05-07T15:00:00-09:00', NOW_MS)).toBe(0);
    expect(computeDaysSince('2026-04-24', NOW_MS)).toBe(14);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-006 ISO 8601 以外の書き方（2026/05/07・May 7, 2026・20260507）には RangeError を投げる', () => {
    for (const fetchedAt of ['2026/05/07', 'May 7, 2026', '20260507']) {
      expect(() => computeDaysSince(fetchedAt, NOW_MS), fetchedAt).toThrow(RangeError);
    }
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-007 時差の無い時刻 2026-05-07T08:00:00 には RangeError を投げる', () => {
    expect(() => computeDaysSince('2026-05-07T08:00:00', NOW_MS)).toThrow(RangeError);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-008 存在しない日付（2 月 30 日・13 月・4 月 31 日）には RangeError を投げ、閏日 2024-02-29 は受け付ける', () => {
    for (const fetchedAt of ['2026-02-30T00:00:00Z', '2026-13-01', '2026-04-31']) {
      expect(() => computeDaysSince(fetchedAt, NOW_MS), fetchedAt).toThrow(RangeError);
    }
    expect(computeDaysSince('2024-02-29', Date.parse('2024-03-01T00:00:00Z'))).toBe(1);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-009 NaN・Infinity・-Infinity の nowMs には RangeError を投げる', () => {
    for (const nowMs of [NaN, Infinity, -Infinity]) {
      expect(() => computeDaysSince('2026-05-07T00:00:00Z', nowMs), String(nowMs)).toThrow(
        RangeError
      );
    }
  });

  it("SPEC-ABBR-COMPUTE-DAYS-SINCE-009 文字列 '1' の nowMs には TypeError を投げ、undefined はシステム時刻を使う", () => {
    expect(() => computeDaysSince('2026-05-07T00:00:00Z', asNumber('1'))).toThrow(TypeError);
    const nearFuture = new Date(Date.now() + 5 * 60_000).toISOString();
    expect(computeDaysSince(nearFuture, undefined)).toBe(0);
  });

  it('SPEC-ABBR-COMPUTE-DAYS-SINCE-010 文字列でない fetchedAt（null・undefined・数値・Date）には TypeError を投げる', () => {
    for (const fetchedAt of [null, undefined, 1778198400000, new Date()]) {
      expect(() => computeDaysSince(asString(fetchedAt), NOW_MS), String(fetchedAt)).toThrow(
        TypeError
      );
    }
  });
});

describe('judgeStaleness — 20261001-input-guards', () => {
  it('SPEC-ABBR-JUDGE-STALENESS-005 負の値 -5・-0.5 には RangeError を投げ、0 は fresh', () => {
    expect(() => judgeStaleness(-5)).toThrow(RangeError);
    expect(() => judgeStaleness(-0.5)).toThrow(RangeError);
    expect(judgeStaleness(0)).toBe('fresh');
  });

  it('SPEC-ABBR-JUDGE-STALENESS-006 NaN・Infinity・-Infinity には RangeError を投げる', () => {
    for (const daysSince of [NaN, Infinity, -Infinity]) {
      expect(() => judgeStaleness(daysSince), String(daysSince)).toThrow(RangeError);
    }
  });

  it("SPEC-ABBR-JUDGE-STALENESS-006 文字列 '7'・null・undefined には TypeError を投げる", () => {
    for (const daysSince of ['7', null, undefined]) {
      expect(() => judgeStaleness(asNumber(daysSince)), String(daysSince)).toThrow(TypeError);
    }
  });
});
