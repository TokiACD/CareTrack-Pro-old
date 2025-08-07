/**
 * Cross-Browser Compatibility Utilities for CareTrack Pro
 * Ensures consistent behavior across Chrome, Firefox, Safari, and Edge
 */

// Detect browser type
export const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
  const isEdge = /Edg/.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  return {
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isIOS,
    isAndroid,
    isMobile: isIOS || isAndroid,
    userAgent
  };
};

// Check for browser-specific features
export const checkBrowserFeatures = () => {
  const features = {
    flexbox: 'flex' in document.createElement('div').style,
    grid: 'grid' in document.createElement('div').style,
    customProperties: window.CSS && window.CSS.supports('color', 'var(--fake-var)'),
    intersectionObserver: 'IntersectionObserver' in window,
    webp: false,
    touchEvents: 'ontouchstart' in window,
    pointerEvents: 'onpointerdown' in window,
    backdrop: window.CSS && window.CSS.supports('backdrop-filter', 'blur(1px)'),
  };

  // Test WebP support
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  features.webp = canvas.toDataURL('image/webp').startsWith('data:image/webp');

  return features;
};

// Apply browser-specific fixes
export const applyBrowserFixes = () => {
  const browser = getBrowserInfo();
  
  // iOS Safari fixes
  if (browser.isSafari && browser.isIOS) {
    // Prevent zoom on input focus
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }

    // Add iOS-specific CSS class
    document.documentElement.classList.add('ios-safari');
    
    // Fix 100vh on iOS Safari
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
  }

  // Firefox fixes
  if (browser.isFirefox) {
    document.documentElement.classList.add('firefox');
    
    // Firefox input styling fixes
    const style = document.createElement('style');
    style.textContent = `
      input[type="number"] {
        -moz-appearance: textfield;
      }
      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // Edge fixes
  if (browser.isEdge) {
    document.documentElement.classList.add('edge');
  }

  // Chrome fixes
  if (browser.isChrome) {
    document.documentElement.classList.add('chrome');
  }
};

// Touch device detection and optimization
export const optimizeForTouch = () => {
  const features = checkBrowserFeatures();
  
  if (features.touchEvents) {
    document.documentElement.classList.add('touch-device');
    
    // Add touch-specific styles
    const style = document.createElement('style');
    style.textContent = `
      .touch-device {
        --touch-target-min: 44px;
      }
      
      .touch-device button,
      .touch-device [role="button"],
      .touch-device input,
      .touch-device .MuiButton-root,
      .touch-device .MuiIconButton-root {
        min-height: var(--touch-target-min);
        min-width: var(--touch-target-min);
      }
      
      .touch-device .MuiTextField-root .MuiOutlinedInput-root {
        min-height: 52px;
      }
      
      /* Improve tap highlighting */
      .touch-device * {
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
        -webkit-touch-callout: none;
      }
      
      /* Better touch scrolling */
      .touch-device * {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
    `;
    document.head.appendChild(style);
  }
};

// Performance optimizations based on browser
export const optimizePerformance = () => {
  const browser = getBrowserInfo();
  const features = checkBrowserFeatures();

  // Disable animations on low-performance devices
  if (browser.isAndroid || (browser.isSafari && browser.isIOS)) {
    const style = document.createElement('style');
    style.textContent = `
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
      
      /* Reduce transforms on older devices */
      @media (max-width: 768px) {
        .MuiCard-root:hover {
          transform: scale(1.02) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Enable hardware acceleration for supported browsers
  if (features.customProperties) {
    const style = document.createElement('style');
    style.textContent = `
      .MuiCard-root,
      .MuiButton-root,
      .MuiPaper-root {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
      }
    `;
    document.head.appendChild(style);
  }
};

// Accessibility enhancements
export const enhanceAccessibility = () => {
  const features = checkBrowserFeatures();
  
  // Focus management for touch devices
  if (features.touchEvents) {
    document.addEventListener('touchstart', () => {
      document.body.classList.add('using-touch');
      document.body.classList.remove('using-keyboard');
    });
    
    document.addEventListener('keydown', () => {
      document.body.classList.add('using-keyboard');
      document.body.classList.remove('using-touch');
    });
  }

  // High contrast mode detection
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    document.documentElement.classList.add('high-contrast');
  }

  // Reduced motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduce-motion');
  }
};

// Initialize all browser compatibility fixes
export const initializeBrowserCompat = () => {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyBrowserFixes();
      optimizeForTouch();
      optimizePerformance();
      enhanceAccessibility();
    });
  } else {
    applyBrowserFixes();
    optimizeForTouch();
    optimizePerformance();
    enhanceAccessibility();
  }
};

// CSS-in-JS helpers for browser-specific styling
export const getBrowserSpecificStyles = (theme: any) => {
  const browser = getBrowserInfo();
  
  return {
    // Safari-specific styles
    ...(browser.isSafari && {
      WebkitAppearance: 'none',
      WebkitBackfaceVisibility: 'hidden',
    }),
    
    // Firefox-specific styles
    ...(browser.isFirefox && {
      MozAppearance: 'none',
    }),
    
    // Edge-specific styles
    ...(browser.isEdge && {
      msOverflowStyle: 'none',
    }),
    
    // Mobile-specific styles
    ...(browser.isMobile && {
      WebkitTapHighlightColor: 'transparent',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
    }),
  };
};

export default {
  getBrowserInfo,
  checkBrowserFeatures,
  applyBrowserFixes,
  optimizeForTouch,
  optimizePerformance,
  enhanceAccessibility,
  initializeBrowserCompat,
  getBrowserSpecificStyles,
};