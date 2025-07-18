/**
 * Mobile device detection utilities
 */

export const isMobileDevice = (): boolean => {
  // Check user agent for mobile patterns
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Mobile device patterns
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // Check user agent
  const isMobileUA = mobileRegex.test(userAgent.toLowerCase());
  
  // Check screen size (backup method)
  const isMobileScreen = window.innerWidth <= 768;
  
  // Check touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Return true if any mobile indicator is present
  return isMobileUA || (isMobileScreen && isTouchDevice);
};

export const isTablet = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Tablet specific patterns
  const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
  
  return tabletRegex.test(userAgent.toLowerCase());
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isMobileDevice() && !isTablet()) {
    return 'mobile';
  } else if (isTablet()) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

export const shouldShowMobileWarning = (): boolean => {
  const deviceType = getDeviceType();
  
  // Show warning for mobile devices and small tablets
  return deviceType === 'mobile' || (deviceType === 'tablet' && window.innerWidth < 1024);
};

// Local storage key for dismissed warning
const MOBILE_WARNING_DISMISSED_KEY = 'cellm_mobile_warning_dismissed';

export const isMobileWarningDismissed = (): boolean => {
  try {
    const dismissed = localStorage.getItem(MOBILE_WARNING_DISMISSED_KEY);
    return dismissed === 'true';
  } catch {
    return false;
  }
};

export const dismissMobileWarning = (): void => {
  try {
    localStorage.setItem(MOBILE_WARNING_DISMISSED_KEY, 'true');
  } catch {
    // localStorage not available, ignore
  }
};

export const resetMobileWarning = (): void => {
  try {
    localStorage.removeItem(MOBILE_WARNING_DISMISSED_KEY);
  } catch {
    // localStorage not available, ignore
  }
};
