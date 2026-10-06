import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shiftBusinessDateInTehran, tehranBusinessDate } from '../../utils/businessDate';

test('admin order ranges use Tehran calendar dates rather than UTC timestamps', () => {
  const nearUtcDayBoundary = new Date('2026-10-03T21:00:00.000Z');
  assert.equal(tehranBusinessDate(nearUtcDayBoundary), '2026-10-04');
  assert.equal(shiftBusinessDateInTehran(nearUtcDayBoundary, -7), '2026-09-27');
});
