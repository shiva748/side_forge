import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type DeviceSizeClass = 'compact' | 'standard' | 'large' | 'tablet';

export interface ResponsiveLayoutInfo {
  width: number;
  height: number;
  isLandscape: boolean;
  sizeClass: DeviceSizeClass;
  isSmallPhone: boolean;
  isTablet: boolean;
  horizontalPadding: number;
  verticalPadding: number;
  contentMaxWidth: number;
  columns: 1 | 2;
  tileColumns: 1 | 2;
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Adaptive layout hook that responds dynamically to screen dimensions,
 * orientation changes, tablet viewports, and safe-area insets.
 */
export function useResponsiveLayout(): ResponsiveLayoutInfo {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const shortestSide = Math.min(width, height);
  const isLandscape = width > height;
  const isTablet = shortestSide >= 600 || width >= 768;
  const isSmallPhone = shortestSide < 360;

  let sizeClass: DeviceSizeClass = 'standard';
  if (isTablet) {
    sizeClass = 'tablet';
  } else if (isSmallPhone) {
    sizeClass = 'compact';
  } else if (width >= 412) {
    sizeClass = 'large';
  }

  const horizontalPadding = isTablet ? 24 : isSmallPhone ? 14 : 16;
  const verticalPadding = isTablet ? 20 : isSmallPhone ? 14 : 16;
  const contentMaxWidth = isTablet ? 840 : 600;
  const columns: 1 | 2 = isTablet || (isLandscape && width >= 680) ? 2 : 1;
  const tileColumns: 1 | 2 = width < 360 ? 1 : 2;

  return {
    width,
    height,
    isLandscape,
    sizeClass,
    isSmallPhone,
    isTablet,
    horizontalPadding,
    verticalPadding,
    contentMaxWidth,
    columns,
    tileColumns,
    insets,
  };
}
