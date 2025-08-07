import React from 'react';
import { Box, Typography, Container, useTheme, useMediaQuery } from '@mui/material';

interface FooterProps {
  /**
   * Position variant of the footer
   * - 'fixed': Fixed at bottom of viewport
   * - 'static': Static position in document flow
   * - 'sticky': Sticky at bottom when content doesn't fill viewport
   */
  position?: 'fixed' | 'static' | 'sticky';
  /**
   * Background variant
   * - 'primary': Uses primary theme color
   * - 'neutral': Uses neutral background
   * - 'transparent': Transparent background
   */
  variant?: 'primary' | 'neutral' | 'transparent';
  /**
   * Size variant
   * - 'compact': Minimal padding and height
   * - 'normal': Standard padding and height
   * - 'spacious': Extra padding and height
   */
  size?: 'compact' | 'normal' | 'spacious';
  /**
   * Additional sx props for custom styling
   */
  sx?: object;
}

/**
 * Professional Footer Component
 * 
 * A responsive footer component that matches the CareTrack Pro design system.
 * Includes company branding, copyright notice, and mobile-optimized layout.
 * 
 * Features:
 * - Responsive design with mobile-first approach
 * - Multiple positioning options (fixed, static, sticky)
 * - Theme-aware styling with consistent branding
 * - Touch-friendly mobile layout
 * - Professional healthcare styling
 */
export function Footer({ 
  position = 'static', 
  variant = 'primary', 
  size = 'normal',
  sx = {} 
}: FooterProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Size configuration
  const sizeConfig = {
    compact: {
      padding: isMobile ? '12px 0' : '16px 0',
      fontSize: isMobile ? '0.75rem' : '0.8125rem'
    },
    normal: {
      padding: isMobile ? '16px 0' : '20px 0',
      fontSize: isMobile ? '0.8125rem' : '0.875rem'
    },
    spacious: {
      padding: isMobile ? '20px 0' : '32px 0',
      fontSize: isMobile ? '0.875rem' : '1rem'
    }
  };

  // Variant styling
  const variantStyles = {
    primary: {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      borderTop: `1px solid ${theme.palette.primary.dark}`
    },
    neutral: {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.secondary,
      borderTop: `1px solid ${theme.palette.divider}`,
      boxShadow: '0px -1px 3px rgba(10, 34, 60, 0.08)'
    },
    transparent: {
      backgroundColor: 'transparent',
      color: theme.palette.text.secondary,
      borderTop: `1px solid ${theme.palette.divider}`
    }
  };

  // Position styling
  const positionStyles = {
    fixed: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: theme.zIndex.appBar
    },
    static: {
      position: 'static' as const
    },
    sticky: {
      position: 'sticky' as const,
      bottom: 0,
      zIndex: theme.zIndex.appBar,
      marginTop: 'auto'
    }
  };

  const config = sizeConfig[size];
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        mt: 'auto', // Push to bottom in flex containers
        ...positionStyles[position],
        ...variantStyles[variant],
        // Ensure proper touch targets on mobile
        minHeight: isMobile ? 48 : 56,
        // Improve text readability
        textShadow: variant === 'primary' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
        // Prevent extra spacing below footer
        flexShrink: 0,
        // Custom sx props
        ...sx
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: config.padding,
          // Mobile-specific adjustments
          px: isMobile ? 2 : 3
        }}
      >
        <Typography
          variant="body2"
          component="p"
          align="center"
          sx={{
            fontSize: config.fontSize,
            fontWeight: 400,
            letterSpacing: '0.01em',
            lineHeight: 1.5,
            // Enhanced mobile typography
            '@media (max-width:600px)': {
              fontSize: config.fontSize,
              lineHeight: 1.4,
              textAlign: 'center'
            },
            // Smooth text rendering
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            // Ensure good contrast
            opacity: variant === 'primary' ? 0.95 : 0.87
          }}
        >
          © {currentYear} Joshs care company Ltd. All rights reserved.
        </Typography>
      </Container>
      
      {/* Accessibility enhancement for screen readers */}
      <Box
        component="span"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0
        }}
      >
        CareTrack Pro footer - Copyright notice for Joshs care company Limited
      </Box>
    </Box>
  );
}

/**
 * Usage Examples:
 * 
 * // Basic footer
 * <Footer />
 * 
 * // Fixed footer with primary styling
 * <Footer position="fixed" variant="primary" />
 * 
 * // Compact footer with neutral styling
 * <Footer size="compact" variant="neutral" />
 * 
 * // Sticky footer for pages with dynamic content
 * <Footer position="sticky" variant="transparent" size="spacious" />
 */

export default Footer;