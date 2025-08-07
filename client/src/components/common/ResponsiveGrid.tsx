import React, { ReactNode } from 'react'
import {
  Grid,
  Box,
  useTheme,
  useMediaQuery,
  Breakpoint,
} from '@mui/material'

interface ResponsiveGridProps {
  children: ReactNode
  spacing?: number
  maxWidth?: Breakpoint | false
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

interface ResponsiveCardGridProps extends ResponsiveGridProps {
  minCardWidth?: number
  maxCardWidth?: number
}

// Professional responsive grid for dashboard cards
export function ResponsiveCardGrid({
  children,
  spacing = 3,
  maxWidth = 'xl',
  minCardWidth = 280,
  maxCardWidth = 400,
}: ResponsiveCardGridProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'))

  // Calculate responsive columns based on screen size and card constraints
  const getColumns = () => {
    if (isMobile) return 1
    if (isTablet) return 2
    
    // For larger screens, calculate based on available width
    const container = maxWidth === 'xl' ? 1536 : maxWidth === 'lg' ? 1200 : 960
    const availableWidth = container - (spacing * 8 * 2) // Account for container padding
    const cardWithSpacing = maxCardWidth + (spacing * 8)
    const calculatedColumns = Math.floor(availableWidth / cardWithSpacing)
    
    return Math.min(Math.max(calculatedColumns, 2), 4) // Between 2-4 columns
  }

  const columns = getColumns()

  return (
    <Box
      sx={{
        maxWidth: maxWidth,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Grid container spacing={spacing}>
        {React.Children.map(children, (child, index) => (
          <Grid
            item
            xs={12}
            sm={columns >= 2 ? 6 : 12}
            md={columns >= 3 ? 4 : columns >= 2 ? 6 : 12}
            lg={columns >= 4 ? 3 : columns >= 3 ? 4 : columns >= 2 ? 6 : 12}
            xl={columns >= 4 ? 3 : columns >= 3 ? 4 : columns >= 2 ? 6 : 12}
            key={index}
          >
            {child}
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

// Professional responsive grid for content sections
export function ResponsiveContentGrid({
  children,
  spacing = 4,
  maxWidth = 'xl',
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 4 },
}: ResponsiveGridProps) {
  return (
    <Box
      sx={{
        maxWidth: maxWidth,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Grid container spacing={spacing}>
        {React.Children.map(children, (child, index) => (
          <Grid
            item
            xs={12 / (columns.xs || 1)}
            sm={12 / (columns.sm || 2)}
            md={12 / (columns.md || 3)}
            lg={12 / (columns.lg || 4)}
            xl={12 / (columns.xl || 4)}
            key={index}
          >
            {child}
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

// Mobile-first responsive container
export function ResponsiveContainer({
  children,
  maxWidth = 'xl',
  spacing = 3,
}: ResponsiveGridProps) {
  const theme = useTheme()
  
  return (
    <Box
      sx={{
        maxWidth: maxWidth,
        mx: 'auto',
        px: {
          xs: theme.spacing(2),
          sm: theme.spacing(3),
          md: theme.spacing(4),
          lg: theme.spacing(5),
        },
        py: {
          xs: theme.spacing(2),
          sm: theme.spacing(3),
          md: theme.spacing(4),
        },
      }}
    >
      {children}
    </Box>
  )
}

export default ResponsiveCardGrid