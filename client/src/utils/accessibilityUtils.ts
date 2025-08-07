/**
 * Accessibility Testing and Compliance Utilities
 * Ensures CareTrack Pro meets WCAG 2.1 AA standards for healthcare applications
 */

// Color contrast testing
export const testColorContrast = (foreground: string, background: string) => {
  // Convert hex/rgb to luminance values
  const getRGB = (color: string): [number, number, number] => {
    let r: number, g: number, b: number;

    if (color.startsWith('#')) {
      const hex = color.slice(1);
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (!match) return [0, 0, 0];
      [r, g, b] = match.map(Number);
    } else {
      return [0, 0, 0];
    }

    return [r, g, b];
  };

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const [r1, g1, b1] = getRGB(foreground);
  const [r2, g2, b2] = getRGB(background);

  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const contrastRatio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: contrastRatio,
    wcagAA: contrastRatio >= 4.5,
    wcagAAA: contrastRatio >= 7,
    wcagAALarge: contrastRatio >= 3,
    level: contrastRatio >= 7 ? 'AAA' : contrastRatio >= 4.5 ? 'AA' : contrastRatio >= 3 ? 'AA Large' : 'Fail',
  };
};

// Keyboard navigation testing
export const testKeyboardNavigation = () => {
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="tab"], [role="menuitem"]'
  );

  const results: Array<{
    element: Element;
    tabIndex: number;
    hasVisibleFocus: boolean;
    isKeyboardAccessible: boolean;
    role: string | null;
    ariaLabel: string | null;
    issues: string[];
  }> = [];

  focusableElements.forEach((element, index) => {
    const tabIndex = element.getAttribute('tabindex') ? parseInt(element.getAttribute('tabindex')!) : 0;
    const computedStyle = window.getComputedStyle(element);
    
    // Check for visible focus indicators
    const hasVisibleFocus = !!(
      computedStyle.outlineWidth !== '0px' ||
      computedStyle.outlineStyle !== 'none' ||
      computedStyle.boxShadow.includes('inset') ||
      element.matches(':focus-visible')
    );

    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');

    const issues: string[] = [];
    
    if (tabIndex < 0 && !['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) {
      issues.push('Element may not be keyboard accessible');
    }
    
    if (!hasVisibleFocus) {
      issues.push('Missing visible focus indicator');
    }

    if (!ariaLabel && !element.textContent?.trim() && element.tagName.toLowerCase() !== 'input') {
      issues.push('Missing accessible name');
    }

    results.push({
      element,
      tabIndex,
      hasVisibleFocus,
      isKeyboardAccessible: tabIndex >= 0,
      role,
      ariaLabel,
      issues,
    });
  });

  const accessibleCount = results.filter(r => r.isKeyboardAccessible && r.hasVisibleFocus).length;
  const score = (accessibleCount / results.length) * 100;

  return {
    totalElements: results.length,
    accessibleElements: accessibleCount,
    results,
    score: Math.round(score),
    recommendations: [
      'Ensure all interactive elements are keyboard accessible',
      'Provide visible focus indicators',
      'Use semantic HTML elements',
      'Add appropriate ARIA labels',
      'Test with screen readers',
    ],
  };
};

// Screen reader testing
export const testScreenReaderSupport = () => {
  const results: Array<{
    element: Element;
    type: string;
    hasLabel: boolean;
    hasDescription: boolean;
    hasRole: boolean;
    isValid: boolean;
    issues: string[];
  }> = [];

  // Test form elements
  const formElements = document.querySelectorAll('input, select, textarea, button');
  formElements.forEach(element => {
    const hasLabel = !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      document.querySelector(`label[for="${element.id}"]`) ||
      element.closest('label')
    );

    const hasDescription = !!(
      element.getAttribute('aria-describedby') ||
      element.getAttribute('title')
    );

    const hasRole = !!element.getAttribute('role');

    const issues: string[] = [];
    if (!hasLabel && element.tagName.toLowerCase() !== 'button') {
      issues.push('Missing label for screen readers');
    }
    if (element.getAttribute('type') === 'submit' && !element.textContent?.trim() && !element.getAttribute('value')) {
      issues.push('Submit button needs accessible text');
    }

    results.push({
      element,
      type: 'form',
      hasLabel,
      hasDescription,
      hasRole,
      isValid: hasLabel,
      issues,
    });
  });

  // Test images
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    const hasAlt = !!img.getAttribute('alt');
    const isDecorative = img.getAttribute('alt') === '' || img.getAttribute('role') === 'presentation';
    
    const issues: string[] = [];
    if (!hasAlt && !isDecorative) {
      issues.push('Missing alt text');
    }

    results.push({
      element: img,
      type: 'image',
      hasLabel: hasAlt,
      hasDescription: false,
      hasRole: !!img.getAttribute('role'),
      isValid: hasAlt || isDecorative,
      issues,
    });
  });

  // Test headings structure
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;
  
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const issues: string[] = [];
    
    if (index === 0 && level !== 1) {
      issues.push('Page should start with h1');
    }
    
    if (level > previousLevel + 1) {
      issues.push(`Heading level skipped (h${previousLevel} to h${level})`);
    }

    results.push({
      element: heading,
      type: 'heading',
      hasLabel: !!heading.textContent?.trim(),
      hasDescription: false,
      hasRole: !!heading.getAttribute('role'),
      isValid: !!heading.textContent?.trim() && level <= previousLevel + 1,
      issues,
    });

    previousLevel = level;
  });

  const validCount = results.filter(r => r.isValid).length;
  const score = results.length > 0 ? (validCount / results.length) * 100 : 100;

  return {
    totalElements: results.length,
    validElements: validCount,
    results,
    score: Math.round(score),
    headingStructure: Array.from(headings).map(h => ({
      level: parseInt(h.tagName.charAt(1)),
      text: h.textContent?.trim() || '',
    })),
  };
};

// ARIA attributes testing
export const testAriaImplementation = () => {
  const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [aria-expanded], [aria-hidden], [role]');
  
  const results: Array<{
    element: Element;
    attributes: Record<string, string>;
    isValid: boolean;
    issues: string[];
  }> = [];

  elementsWithAria.forEach(element => {
    const attributes: Record<string, string> = {};
    const issues: string[] = [];

    // Collect ARIA attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('aria-') || attr.name === 'role') {
        attributes[attr.name] = attr.value;
      }
    });

    // Validate ARIA attributes
    if (attributes['aria-labelledby']) {
      const labelIds = attributes['aria-labelledby'].split(' ');
      labelIds.forEach(id => {
        if (!document.getElementById(id)) {
          issues.push(`Referenced element with id "${id}" not found`);
        }
      });
    }

    if (attributes['aria-describedby']) {
      const descIds = attributes['aria-describedby'].split(' ');
      descIds.forEach(id => {
        if (!document.getElementById(id)) {
          issues.push(`Referenced element with id "${id}" not found`);
        }
      });
    }

    if (attributes.role) {
      const validRoles = [
        'button', 'link', 'tab', 'tabpanel', 'tablist', 'menuitem', 'menu', 'menubar',
        'dialog', 'alertdialog', 'alert', 'status', 'progressbar', 'slider',
        'checkbox', 'radio', 'textbox', 'combobox', 'listbox', 'option',
        'grid', 'gridcell', 'table', 'row', 'columnheader', 'rowheader',
        'presentation', 'none', 'banner', 'main', 'navigation', 'complementary',
        'contentinfo', 'region', 'search', 'form', 'article', 'section'
      ];
      
      if (!validRoles.includes(attributes.role)) {
        issues.push(`Unknown ARIA role: "${attributes.role}"`);
      }
    }

    results.push({
      element,
      attributes,
      isValid: issues.length === 0,
      issues,
    });
  });

  const validCount = results.filter(r => r.isValid).length;
  const score = results.length > 0 ? (validCount / results.length) * 100 : 100;

  return {
    totalElements: results.length,
    validElements: validCount,
    results,
    score: Math.round(score),
  };
};

// Mobile accessibility testing
export const testMobileAccessibility = () => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for responsive meta tag
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    issues.push('Missing viewport meta tag');
  } else {
    const content = viewportMeta.getAttribute('content') || '';
    if (!content.includes('width=device-width')) {
      issues.push('Viewport meta tag should include width=device-width');
    }
  }

  // Check for touch target sizes
  const interactiveElements = document.querySelectorAll(
    'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
  );

  let tooSmallTargets = 0;
  interactiveElements.forEach(element => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      tooSmallTargets++;
    }
  });

  if (tooSmallTargets > 0) {
    issues.push(`${tooSmallTargets} touch targets are smaller than 44px`);
    recommendations.push('Increase touch target sizes to at least 44x44 pixels');
  }

  // Check for horizontal scrolling
  if (document.documentElement.scrollWidth > window.innerWidth) {
    issues.push('Page has horizontal scrolling on mobile');
    recommendations.push('Ensure responsive design prevents horizontal scrolling');
  }

  // Check text sizing
  const textElements = document.querySelectorAll('p, span, div, label');
  let smallTextCount = 0;
  textElements.forEach(element => {
    const fontSize = parseFloat(window.getComputedStyle(element).fontSize);
    if (fontSize < 16) {
      smallTextCount++;
    }
  });

  if (smallTextCount > textElements.length * 0.1) {
    issues.push('Many text elements are smaller than 16px');
    recommendations.push('Use minimum 16px font size for mobile readability');
  }

  return {
    issues,
    recommendations,
    score: Math.max(0, 100 - (issues.length * 10)),
    hasIssues: issues.length > 0,
  };
};

// Comprehensive accessibility audit
export const runAccessibilityAudit = () => {
  const colorContrast = testColorContrast('#000000', '#ffffff'); // Example, should test actual colors
  const keyboardNav = testKeyboardNavigation();
  const screenReader = testScreenReaderSupport();
  const ariaImplementation = testAriaImplementation();
  const mobileA11y = testMobileAccessibility();

  const overallScore = [
    keyboardNav.score,
    screenReader.score,
    ariaImplementation.score,
    mobileA11y.score,
  ].reduce((a, b) => a + b) / 4;

  return {
    timestamp: new Date().toISOString(),
    overallScore: Math.round(overallScore),
    grade: overallScore >= 90 ? 'AA' : overallScore >= 70 ? 'A' : overallScore >= 50 ? 'B' : 'C',
    wcagLevel: overallScore >= 90 ? 'WCAG 2.1 AA' : overallScore >= 70 ? 'WCAG 2.1 A' : 'Below WCAG standards',
    results: {
      keyboardNavigation: keyboardNav,
      screenReaderSupport: screenReader,
      ariaImplementation,
      mobileAccessibility: mobileA11y,
    },
    recommendations: [
      'Add focus indicators to all interactive elements',
      'Ensure proper heading structure',
      'Provide alternative text for images',
      'Use sufficient color contrast',
      'Test with screen readers',
      'Ensure keyboard-only navigation works',
      'Optimize for mobile accessibility',
      'Follow WCAG 2.1 AA guidelines',
    ],
    criticalIssues: [
      ...keyboardNav.results.filter(r => r.issues.length > 0).map(r => `Keyboard: ${r.issues[0]}`),
      ...screenReader.results.filter(r => r.issues.length > 0).map(r => `Screen Reader: ${r.issues[0]}`),
      ...mobileA11y.issues.map(issue => `Mobile: ${issue}`),
    ],
  };
};

export default {
  testColorContrast,
  testKeyboardNavigation,
  testScreenReaderSupport,
  testAriaImplementation,
  testMobileAccessibility,
  runAccessibilityAudit,
};