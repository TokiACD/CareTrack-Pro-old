/**
 * Mobile Testing and Responsive Design Utilities
 * Comprehensive testing tools for mobile responsiveness across different devices
 */

// Device profiles for testing
export const deviceProfiles = {
  // Small Mobile Phones (320px - 414px)
  iPhone5: { width: 320, height: 568, name: 'iPhone SE/5s' },
  iPhone6: { width: 375, height: 667, name: 'iPhone 8/SE2' },
  iPhone12: { width: 390, height: 844, name: 'iPhone 12/13' },
  iPhone14Pro: { width: 393, height: 852, name: 'iPhone 14 Pro' },
  
  // Android Phones
  galaxyS8: { width: 360, height: 740, name: 'Galaxy S8' },
  pixel5: { width: 393, height: 851, name: 'Pixel 5' },
  
  // Large Phones/Small Tablets (414px - 768px)
  iPhonePlus: { width: 414, height: 736, name: 'iPhone 8 Plus' },
  galaxyNote: { width: 412, height: 869, name: 'Galaxy Note' },
  
  // Tablets (768px - 1024px)
  iPadMini: { width: 768, height: 1024, name: 'iPad Mini' },
  iPad: { width: 820, height: 1180, name: 'iPad Air' },
  iPadPro: { width: 1024, height: 1366, name: 'iPad Pro' },
  galaxyTab: { width: 800, height: 1280, name: 'Galaxy Tab' },
  
  // Desktop (1024px+)
  desktop: { width: 1920, height: 1080, name: 'Desktop' },
  laptop: { width: 1366, height: 768, name: 'Laptop' },
} as const;

// Breakpoint testing
export const testBreakpoints = () => {
  const breakpoints = {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  };

  const currentWidth = window.innerWidth;
  const currentBreakpoint = Object.entries(breakpoints)
    .reverse()
    .find(([_, width]) => currentWidth >= width)?.[0] || 'xs';

  return {
    currentWidth,
    currentBreakpoint,
    breakpoints,
    isXs: currentWidth < breakpoints.sm,
    isSm: currentWidth >= breakpoints.sm && currentWidth < breakpoints.md,
    isMd: currentWidth >= breakpoints.md && currentWidth < breakpoints.lg,
    isLg: currentWidth >= breakpoints.lg && currentWidth < breakpoints.xl,
    isXl: currentWidth >= breakpoints.xl,
    isMobile: currentWidth < breakpoints.md,
    isTablet: currentWidth >= breakpoints.md && currentWidth < breakpoints.lg,
    isDesktop: currentWidth >= breakpoints.lg,
  };
};

// Touch interaction testing
export const testTouchTargets = () => {
  const minTouchTarget = 44; // Apple's recommended minimum
  const preferredTouchTarget = 48; // Material Design recommendation
  
  const interactiveElements = document.querySelectorAll(
    'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
  );

  const results: Array<{
    element: Element;
    width: number;
    height: number;
    isAccessible: boolean;
    isPreferred: boolean;
    suggestions: string[];
  }> = [];

  interactiveElements.forEach(element => {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    const width = Math.max(
      rect.width,
      parseFloat(computedStyle.minWidth) || 0
    );
    const height = Math.max(
      rect.height,
      parseFloat(computedStyle.minHeight) || 0
    );

    const isAccessible = width >= minTouchTarget && height >= minTouchTarget;
    const isPreferred = width >= preferredTouchTarget && height >= preferredTouchTarget;

    const suggestions: string[] = [];
    if (!isAccessible) {
      if (width < minTouchTarget) suggestions.push(`Increase width to ${minTouchTarget}px`);
      if (height < minTouchTarget) suggestions.push(`Increase height to ${minTouchTarget}px`);
    } else if (!isPreferred) {
      suggestions.push(`Consider increasing to ${preferredTouchTarget}px for better usability`);
    }

    results.push({
      element,
      width,
      height,
      isAccessible,
      isPreferred,
      suggestions,
    });
  });

  return {
    totalElements: results.length,
    accessibleElements: results.filter(r => r.isAccessible).length,
    preferredElements: results.filter(r => r.isPreferred).length,
    results,
    score: (results.filter(r => r.isAccessible).length / results.length) * 100,
  };
};

// Test text readability on mobile
export const testTextReadability = () => {
  const minFontSize = 16; // Recommended minimum for mobile
  const preferredLineHeight = 1.5;

  const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label');
  
  const results: Array<{
    element: Element;
    fontSize: number;
    lineHeight: number;
    isReadable: boolean;
    suggestions: string[];
  }> = [];

  textElements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const fontSize = parseFloat(computedStyle.fontSize);
    const lineHeight = parseFloat(computedStyle.lineHeight) / fontSize;

    const isReadable = fontSize >= minFontSize && lineHeight >= preferredLineHeight;

    const suggestions: string[] = [];
    if (fontSize < minFontSize) {
      suggestions.push(`Increase font size to ${minFontSize}px or larger`);
    }
    if (lineHeight < preferredLineHeight) {
      suggestions.push(`Increase line height to ${preferredLineHeight} or higher`);
    }

    if (element.textContent?.trim()) {
      results.push({
        element,
        fontSize,
        lineHeight,
        isReadable,
        suggestions,
      });
    }
  });

  return {
    totalElements: results.length,
    readableElements: results.filter(r => r.isReadable).length,
    results,
    score: (results.filter(r => r.isReadable).length / results.length) * 100,
  };
};

// Test horizontal scrolling issues
export const testHorizontalScroll = () => {
  const documentWidth = document.documentElement.scrollWidth;
  const viewportWidth = window.innerWidth;
  
  const hasHorizontalScroll = documentWidth > viewportWidth;
  
  const wideElements: Element[] = [];
  if (hasHorizontalScroll) {
    document.querySelectorAll('*').forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.right > viewportWidth) {
        wideElements.push(element);
      }
    });
  }

  return {
    hasHorizontalScroll,
    documentWidth,
    viewportWidth,
    overflowWidth: Math.max(0, documentWidth - viewportWidth),
    wideElements,
    suggestions: hasHorizontalScroll ? [
      'Check for fixed widths that exceed viewport',
      'Ensure proper responsive design',
      'Use max-width: 100% on images and containers',
      'Check table layouts for mobile optimization'
    ] : ['No horizontal scroll detected - good!'],
  };
};

// Performance testing for mobile
export const testMobilePerformance = () => {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    // Test image loading performance
    const images = document.querySelectorAll('img');
    let loadedImages = 0;
    const totalImages = images.length;

    if (totalImages === 0) {
      resolve({
        renderTime: performance.now() - startTime,
        imageCount: 0,
        imageLoadTime: 0,
        suggestions: ['Consider lazy loading for images', 'Optimize image sizes for mobile'],
      });
      return;
    }

    images.forEach(img => {
      if (img.complete) {
        loadedImages++;
      } else {
        img.addEventListener('load', () => {
          loadedImages++;
          if (loadedImages === totalImages) {
            resolve({
              renderTime: performance.now() - startTime,
              imageCount: totalImages,
              imageLoadTime: performance.now() - startTime,
              suggestions: [
                'Consider using WebP format for better compression',
                'Implement lazy loading for off-screen images',
                'Optimize image dimensions for different screen sizes',
                'Use responsive images with srcset attribute',
              ],
            });
          }
        });
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      resolve({
        renderTime: performance.now() - startTime,
        imageCount: totalImages,
        imageLoadTime: performance.now() - startTime,
        timeout: true,
        suggestions: ['Some images are taking too long to load', 'Consider image optimization'],
      });
    }, 5000);
  });
};

// Comprehensive mobile audit
export const runMobileAudit = async () => {
  const browserInfo = window.navigator.userAgent;
  const deviceInfo = testBreakpoints();
  const touchTargets = testTouchTargets();
  const textReadability = testTextReadability();
  const horizontalScroll = testHorizontalScroll();
  const performance = await testMobilePerformance();

  const overallScore = [
    touchTargets.score,
    textReadability.score,
    horizontalScroll.hasHorizontalScroll ? 0 : 100,
  ].reduce((a, b) => a + b) / 3;

  return {
    timestamp: new Date().toISOString(),
    browserInfo,
    deviceInfo,
    touchTargets,
    textReadability,
    horizontalScroll,
    performance,
    overallScore: Math.round(overallScore),
    grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F',
    recommendations: [
      ...(touchTargets.score < 90 ? ['Improve touch target sizes'] : []),
      ...(textReadability.score < 90 ? ['Optimize text readability'] : []),
      ...(horizontalScroll.hasHorizontalScroll ? ['Fix horizontal scrolling issues'] : []),
      'Test on multiple devices',
      'Validate with real users',
      'Consider accessibility guidelines',
    ],
  };
};

// Simulate different device viewports (for development testing)
export const simulateDevice = (deviceKey: keyof typeof deviceProfiles) => {
  const device = deviceProfiles[deviceKey];
  
  // Create a testing container
  const testContainer = document.createElement('div');
  testContainer.id = 'device-simulator';
  testContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: ${device.width}px;
    height: ${device.height}px;
    border: 2px solid #333;
    border-radius: 12px;
    background: white;
    z-index: 9999;
    overflow: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  `;

  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    right: 0;
    background: #333;
    color: white;
    padding: 8px;
    font-size: 12px;
    text-align: center;
    border-radius: 4px 4px 0 0;
  `;
  toolbar.textContent = `${device.name} - ${device.width}x${device.height}`;

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 16px;
  `;
  closeButton.onclick = () => document.body.removeChild(testContainer);

  toolbar.appendChild(closeButton);
  testContainer.appendChild(toolbar);

  // Clone current page content
  const iframe = document.createElement('iframe');
  iframe.src = window.location.href;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;

  testContainer.appendChild(iframe);
  document.body.appendChild(testContainer);

  return {
    container: testContainer,
    device,
    close: () => document.body.removeChild(testContainer),
  };
};

export default {
  deviceProfiles,
  testBreakpoints,
  testTouchTargets,
  testTextReadability,
  testHorizontalScroll,
  testMobilePerformance,
  runMobileAudit,
  simulateDevice,
};