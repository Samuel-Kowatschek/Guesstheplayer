import { describe, expect, it } from 'vitest';
import { depixelSteps } from '../src/ui/depixelate';

describe('depixelSteps', () => {
  it('grows from coarse blocks to the full width', () => {
    const steps = depixelSteps(720, 7);
    expect(steps[0]).toBe(6);
    expect(steps.at(-1)).toBe(720);
    expect(steps.length).toBe(7);
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!);
  });
  it('degrades gracefully', () => {
    expect(depixelSteps(720, 1)).toEqual([720]);
    expect(depixelSteps(4, 7)).toEqual([4]);
    expect(depixelSteps(10, 7).at(-1)).toBe(10);
  });
});
