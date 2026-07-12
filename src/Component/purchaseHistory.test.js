import { beforeEach, describe, expect, it } from 'vitest';
import { mergePurchaseHistory } from './purchaseHistory';

describe('purchase history merging', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps local purchases when remote history does not include them yet', () => {
    const merged = mergePurchaseHistory(
      [{ id: 'local-1', total: 25, createdAt: '2026-07-11T00:00:00.000Z' }],
      [{ id: 'remote-1', total: 40, createdAt: '2026-07-10T00:00:00.000Z' }]
    );

    expect(merged.map((purchase) => purchase.id)).toEqual(['local-1', 'remote-1']);
  });
});
