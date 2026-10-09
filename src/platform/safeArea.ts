/** The app frame owns the top inset; navigation owns its bottom inset. */
export const appSafeAreaEdges = ['top'] as const;
/** Screens shown outside the app frame need both system edges. */
export const fallbackSafeAreaEdges = ['top', 'bottom'] as const;
/** Native modal windows need to handle both system edges themselves. */
export const modalSafeAreaEdges = ['top', 'bottom'] as const;

export interface TabBarMetrics {
  height: number;
  paddingTop: number;
  paddingBottom: number;
}

/** Keep the bottom inset in one place, including devices reporting zero. */
export function getTabBarMetrics(bottomInset: number, contentHeight = 64, minimumBottomPadding = 8): TabBarMetrics {
  const inset = Math.max(0, bottomInset);
  return {
    height: contentHeight + inset,
    paddingTop: 4,
    paddingBottom: Math.max(minimumBottomPadding, inset)
  };
}

export function getModalBottomPadding(bottomInset: number): number {
  return Math.max(0, bottomInset);
}
