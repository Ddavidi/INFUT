// Central responsive breakpoints and layout helpers for Mobile (320px+), Tablet & Desktop Web
import { Platform, useWindowDimensions } from 'react-native';

export interface ResponsiveMetrics {
  width: number;
  height: number;
  isCompact: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
  topSpace: number;
  pagePadding: number;
  containerMaxWidth: number;
  numColumns: 1 | 2;
}

export function useResponsive(): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isCompact = width < 380;
  const isTablet = width >= 768;
  const isDesktop = width >= 960;

  const topSpace = isWeb ? (isTablet ? 28 : 18) : 50;
  const pagePadding = isCompact ? 12 : isDesktop ? 28 : 18;
  const containerMaxWidth = isDesktop ? 1120 : isTablet ? 820 : 680;
  const numColumns: 1 | 2 = width >= 900 ? 2 : 1;

  return {
    width,
    height,
    isCompact,
    isTablet,
    isDesktop,
    isWeb,
    topSpace,
    pagePadding,
    containerMaxWidth,
    numColumns,
  };
}
