import { describe, expect, it } from 'vitest';
import {
  appSafeAreaEdges,
  fallbackSafeAreaEdges,
  getModalBottomPadding,
  getTabBarMetrics,
  modalSafeAreaEdges
} from './safeArea';

describe('safe area layout contract', () => {
  it('assigns system edges to the correct owner', () => {
    expect(appSafeAreaEdges).toEqual(['top']);
    expect(fallbackSafeAreaEdges).toEqual(['top', 'bottom']);
    expect(modalSafeAreaEdges).toEqual(['top', 'bottom']);
  });

  it('adds the device bottom inset once and retains minimum padding', () => {
    expect(getTabBarMetrics(0)).toEqual({ height: 64, paddingTop: 4, paddingBottom: 8 });
    expect(getTabBarMetrics(24)).toEqual({ height: 88, paddingTop: 4, paddingBottom: 24 });
    expect(getTabBarMetrics(-2)).toEqual({ height: 64, paddingTop: 4, paddingBottom: 8 });
  });

  it('uses the modal window inset without adding another fixed gap', () => {
    expect(getModalBottomPadding(0)).toBe(0);
    expect(getModalBottomPadding(24)).toBe(24);
    expect(getModalBottomPadding(-1)).toBe(0);
  });
});
