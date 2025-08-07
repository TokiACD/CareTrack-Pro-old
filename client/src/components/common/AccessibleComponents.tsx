import React, { ReactNode, forwardRef } from 'react'
import {
  Box,
  Button,
  Card,
  Typography,
  VisuallyHidden,
  alpha,
  useTheme,
  ButtonProps,
  CardProps,
} from '@mui/material'
import { useAccessibility } from '../../hooks/useAccessibility'

// WCAG AA compliant button with enhanced accessibility
interface AccessibleButtonProps extends ButtonProps {
  children: ReactNode
  ariaLabel?: string
  ariaDescribedBy?: string
  onClick?: () => void
  loading?: boolean
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ children, ariaLabel, ariaDescribedBy, onClick, loading, ...props }, ref) => {
    const { isHighContrast, getHighContrastStyles, prefersReducedMotion } = useAccessibility()
    const theme = useTheme()

    return (
      <Button
        ref={ref}
        {...props}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        onClick={onClick}
        sx={{
          minHeight: 44, // WCAG AA minimum touch target
          minWidth: 44,
          ...getHighContrastStyles(),
          '&:focus-visible': {
            outline: `3px solid ${theme.palette.primary.main}`,
            outlineOffset: '2px',
          },
          transition: prefersReducedMotion ? 'none' : theme.transitions.create([
            'background-color',
            'box-shadow',
            'transform',
          ]),
          ...props.sx,
        }}
      >
        {children}
        {loading && (
          <VisuallyHidden>
            Loading, please wait
          </VisuallyHidden>
        )}
      </Button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

// WCAG AA compliant card with proper focus management
interface AccessibleCardProps extends CardProps {
  children: ReactNode
  ariaLabel?: string
  ariaDescribedBy?: string
  clickable?: boolean
  onClick?: () => void
}

export const AccessibleCard = forwardRef<HTMLDivElement, AccessibleCardProps>(
  ({ children, ariaLabel, ariaDescribedBy, clickable, onClick, ...props }, ref) => {
    const { isHighContrast, getHighContrastStyles, prefersReducedMotion } = useAccessibility()
    const theme = useTheme()

    return (
      <Card
        ref={ref}
        {...props}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        onClick={clickable ? onClick : undefined}
        onKeyDown={clickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        } : undefined}
        sx={{
          ...getHighContrastStyles(),
          cursor: clickable ? 'pointer' : 'default',
          '&:focus-visible': clickable ? {
            outline: `3px solid ${theme.palette.primary.main}`,
            outlineOffset: '2px',
          } : {},
          transition: prefersReducedMotion ? 'none' : theme.transitions.create([
            'background-color',
            'box-shadow',
            'transform',
          ]),
          ...props.sx,
        }}
      >
        {children}
      </Card>
    )
  }
)

AccessibleCard.displayName = 'AccessibleCard'

// Screen reader only announcements
interface ScreenReaderOnlyProps {
  children: ReactNode
  priority?: 'polite' | 'assertive'
}

export function ScreenReaderOnly({ children, priority = 'polite' }: ScreenReaderOnlyProps) {
  return (
    <Box
      component="div"
      aria-live={priority}
      aria-atomic="true"
      sx={{
        position: 'absolute',
        left: -10000,
        width: 1,
        height: 1,
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  )
}

// Skip navigation link for keyboard users
interface SkipLinkProps {
  href: string
  children: ReactNode
}

export function SkipLink({ href, children }: SkipLinkProps) {
  const theme = useTheme()

  return (
    <Box
      component="a"
      href={href}
      sx={{
        position: 'absolute',
        left: -10000,
        top: 'auto',
        width: 1,
        height: 1,
        overflow: 'hidden',
        color: theme.palette.primary.contrastText,
        backgroundColor: theme.palette.primary.main,
        padding: theme.spacing(1, 2),
        borderRadius: 1,
        textDecoration: 'none',
        fontWeight: 600,
        zIndex: 9999,
        '&:focus': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          overflow: 'visible',
        },
      }}
    >
      {children}
    </Box>
  )
}

// Accessible form field with proper labeling
interface AccessibleFieldProps {
  id: string
  label: string
  children: ReactNode
  error?: string
  helperText?: string
  required?: boolean
}

export function AccessibleField({
  id,
  label,
  children,
  error,
  helperText,
  required,
}: AccessibleFieldProps) {
  const errorId = error ? `${id}-error` : undefined
  const helperId = helperText ? `${id}-helper` : undefined

  return (
    <Box>
      <Typography
        component="label"
        htmlFor={id}
        variant="body2"
        sx={{
          fontWeight: 600,
          mb: 1,
          display: 'block',
          color: error ? 'error.main' : 'text.primary',
        }}
      >
        {label}
        {required && (
          <Typography
            component="span"
            sx={{ color: 'error.main', ml: 0.5 }}
            aria-label="required"
          >
            *
          </Typography>
        )}
      </Typography>
      
      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-describedby': [errorId, helperId].filter(Boolean).join(' '),
        'aria-invalid': !!error,
        required,
      })}
      
      {error && (
        <Typography
          id={errorId}
          variant="body2"
          color="error"
          sx={{ mt: 0.5 }}
          role="alert"
        >
          {error}
        </Typography>
      )}
      
      {helperText && !error && (
        <Typography
          id={helperId}
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  )
}

// Focus trap for modals and dialogs
interface FocusTrapProps {
  children: ReactNode
  isActive: boolean
}

export function FocusTrap({ children, isActive }: FocusTrapProps) {
  const { updateFocusableElements, focusFirst, focusLast } = useAccessibility()
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (isActive && containerRef.current) {
      updateFocusableElements(containerRef.current)
      focusFirst()
    }
  }, [isActive, updateFocusableElements, focusFirst])

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive) return

    if (event.key === 'Tab') {
      event.preventDefault()
      if (event.shiftKey) {
        focusLast()
      } else {
        focusFirst()
      }
    }
  }

  React.useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])

  return (
    <Box ref={containerRef}>
      {children}
    </Box>
  )
}

export default {
  AccessibleButton,
  AccessibleCard,
  ScreenReaderOnly,
  SkipLink,
  AccessibleField,
  FocusTrap,
}