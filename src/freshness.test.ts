/**
 * Tests for src/freshness.ts (v0.4.1 / Issue #15)
 *
 * 純関数レベルの単体テスト。
 */

import { describe, expect, it } from 'vitest';
import { STALENESS_THRESHOLDS, computeDaysSince, judgeStaleness } from './freshness.js';

describe('STALENESS_THRESHOLDS', () => {
  it('fresh_days と stale_days が 7 / 30 で固定されている (家族共通の慣行)', () => {
    expect(STALENESS_THRESHOLDS.fresh_days).toBe(7);
    expect(STALENESS_THRESHOLDS.stale_days).toBe(30);
  });

  it('fresh_days < stale_days', () => {
    expect(STALENESS_THRESHOLDS.fresh_days).toBeLessThan(STALENESS_THRESHOLDS.stale_days);
  });
});

describe('judgeStaleness', () => {
  it('0 日 → fresh', () => {
    expect(judgeStaleness(0)).toBe('fresh');
  });

  it('6 日 → fresh (境界 fresh_days=7 未満)', () => {
    expect(judgeStaleness(6)).toBe('fresh');
  });

  it('7 日 → stale (境界 fresh_days と一致は stale)', () => {
    expect(judgeStaleness(7)).toBe('stale');
  });

  it('29 日 → stale (境界 stale_days=30 未満)', () => {
    expect(judgeStaleness(29)).toBe('stale');
  });

  it('30 日 → outdated (境界 stale_days と一致は outdated)', () => {
    expect(judgeStaleness(30)).toBe('outdated');
  });

  it('100 日 → outdated', () => {
    expect(judgeStaleness(100)).toBe('outdated');
  });
});

describe('computeDaysSince', () => {
  it('同一時刻なら 0', () => {
    const t = '2026-05-08T00:00:00Z';
    const nowMs = Date.parse(t);
    expect(computeDaysSince(t, nowMs)).toBe(0);
  });

  it('1 日前なら 1', () => {
    const fetched = '2026-05-07T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    expect(computeDaysSince(fetched, Date.parse(now))).toBe(1);
  });

  it('14 日前なら 14', () => {
    const fetched = '2026-04-24T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    expect(computeDaysSince(fetched, Date.parse(now))).toBe(14);
  });

  it('小数日 (12 時間) は floor で 0', () => {
    const fetched = '2026-05-07T12:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    expect(computeDaysSince(fetched, Date.parse(now))).toBe(0);
  });

  it('未来時刻 (now < fetched) は 0 に丸める', () => {
    const fetched = '2026-06-01T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    expect(computeDaysSince(fetched, Date.parse(now))).toBe(0);
  });

  it('パース不能な文字列は 0', () => {
    expect(computeDaysSince('not-a-date')).toBe(0);
    expect(computeDaysSince('')).toBe(0);
  });

  it('nowMs 省略時はシステム時刻 (sanity check のみ)', () => {
    const nearFuture = new Date(Date.now() + 5 * 60_000).toISOString();
    expect(computeDaysSince(nearFuture)).toBe(0);
  });
});

describe('judgeStaleness × computeDaysSince の組合せ (典型シナリオ)', () => {
  it('1 週間以内に fetch したデータは fresh', () => {
    const fetched = '2026-05-04T00:00:00Z'; // 4 日前
    const now = '2026-05-08T00:00:00Z';
    const days = computeDaysSince(fetched, Date.parse(now));
    expect(judgeStaleness(days)).toBe('fresh');
  });

  it('2 週間前に fetch したデータは stale', () => {
    const fetched = '2026-04-24T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    const days = computeDaysSince(fetched, Date.parse(now));
    expect(judgeStaleness(days)).toBe('stale');
  });

  it('2 ヶ月前に fetch したデータは outdated', () => {
    const fetched = '2026-03-08T00:00:00Z';
    const now = '2026-05-08T00:00:00Z';
    const days = computeDaysSince(fetched, Date.parse(now));
    expect(judgeStaleness(days)).toBe('outdated');
  });
});
