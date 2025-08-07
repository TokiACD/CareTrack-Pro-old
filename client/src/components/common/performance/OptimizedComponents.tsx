import React, { memo, useMemo, useCallback, forwardRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  TablePagination,
} from '@mui/material'
// Note: react-window types may need to be installed separately
// import { FixedSizeList as VirtualizedList, ListChildComponentProps } from 'react-window'

// Fallback types for react-window
interface ListChildComponentProps {
  index: number
  style: React.CSSProperties
}

// Mock VirtualizedList component when react-window is not available
const VirtualizedList: React.FC<{
  height: number
  itemCount: number
  itemSize: number
  width: string
  children: (props: ListChildComponentProps) => React.ReactNode
}> = ({ height, itemCount, itemSize, children }) => {
  // Fallback implementation - render normally for now
  const items = Array.from({ length: Math.min(itemCount, 50) }, (_, index) => (
    children({ index, style: { height: itemSize } })
  ))
  
  return (
    <div style={{ height, overflowY: 'auto' }}>
      {items}
    </div>
  )
}

// Optimized Table Component with Virtualization
interface OptimizedTableProps {
  columns: Array<{
    id: string
    label: string
    minWidth?: number
    align?: 'left' | 'right' | 'center'
    format?: (value: any) => string
  }>
  rows: Array<Record<string, any>>
  loading?: boolean
  height?: number
  onRowClick?: (row: any) => void
  pagination?: {
    count: number
    page: number
    rowsPerPage: number
    onPageChange: (page: number) => void
    onRowsPerPageChange: (rowsPerPage: number) => void
  }
}

export const OptimizedTable = memo<OptimizedTableProps>(({
  columns,
  rows,
  loading = false,
  height = 400,
  onRowClick,
  pagination
}) => {
  const memoizedColumns = useMemo(() => columns, [columns])
  
  const renderRow = useCallback(({ index, style }: ListChildComponentProps) => {
    const row = rows[index]
    if (!row) return null

    return (
      <div style={style}>
        <TableRow
          hover={!!onRowClick}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
        >
          {memoizedColumns.map((column) => {
            const value = row[column.id]
            return (
              <TableCell key={column.id} align={column.align || 'left'}>
                {column.format ? column.format(value) : value}
              </TableCell>
            )
          })}
        </TableRow>
      </div>
    )
  }, [rows, memoizedColumns, onRowClick])

  if (loading) {
    return (
      <TableContainer component={Paper} sx={{ maxHeight: height }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {memoizedColumns.map((column) => (
                <TableCell key={column.id}>
                  <Skeleton width="100%" />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                {memoizedColumns.map((column) => (
                  <TableCell key={column.id}>
                    <Skeleton width="100%" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: height }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {memoizedColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length > 100 ? (
              <VirtualizedList
                height={height - 100} // Account for header
                itemCount={rows.length}
                itemSize={53} // Standard table row height
                width="100%"
              >
                {renderRow}
              </VirtualizedList>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  hover={!!onRowClick}
                  key={row.id || index}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {memoizedColumns.map((column) => {
                    const value = row[column.id]
                    return (
                      <TableCell key={column.id} align={column.align}>
                        {column.format ? column.format(value) : value}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component="div"
          count={pagination.count}
          rowsPerPage={pagination.rowsPerPage}
          page={pagination.page}
          onPageChange={(_, page) => pagination.onPageChange(page)}
          onRowsPerPageChange={(e) => pagination.onRowsPerPageChange(parseInt(e.target.value, 10))}
        />
      )}
    </Paper>
  )
})

OptimizedTable.displayName = 'OptimizedTable'

// Optimized Card Component
interface OptimizedCardProps {
  title: string
  subtitle?: string
  content: React.ReactNode
  actions?: React.ReactNode
  loading?: boolean
  onClick?: () => void
  elevation?: number
}

export const OptimizedCard = memo<OptimizedCardProps>(({
  title,
  subtitle,
  content,
  actions,
  loading = false,
  onClick,
  elevation = 1
}) => {
  if (loading) {
    return (
      <Card elevation={elevation}>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          {subtitle && <Skeleton variant="text" width="40%" height={20} />}
          <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      elevation={elevation} 
      onClick={onClick}
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'elevation 0.2s ease-in-out',
        '&:hover': onClick ? { elevation: elevation + 2 } : {}
      }}
    >
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {subtitle}
          </Typography>
        )}
        <Box sx={{ mt: 2 }}>
          {content}
        </Box>
        {actions && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {actions}
          </Box>
        )}
      </CardContent>
    </Card>
  )
})

OptimizedCard.displayName = 'OptimizedCard'

// Optimized List Component with Virtualization
interface OptimizedListProps {
  items: Array<{
    id: string | number
    primary: string
    secondary?: string
    avatar?: React.ReactNode
    actions?: React.ReactNode
  }>
  height?: number
  onItemClick?: (item: any) => void
  loading?: boolean
}

export const OptimizedList = memo<OptimizedListProps>(({
  items,
  height = 400,
  onItemClick,
  loading = false
}) => {
  const renderItem = useCallback(({ index, style }: ListChildComponentProps) => {
    const item = items[index]
    if (!item) return null

    return (
      <div style={style}>
        <ListItem
          component={onItemClick ? 'button' : 'div'}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
        >
          {item.avatar}
          <ListItemText
            primary={item.primary}
            secondary={item.secondary}
          />
          {item.actions}
        </ListItem>
      </div>
    )
  }, [items, onItemClick])

  if (loading) {
    return (
      <List sx={{ width: '100%', maxHeight: height, overflow: 'auto' }}>
        {Array.from({ length: 10 }).map((_, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={<Skeleton width="60%" />}
              secondary={<Skeleton width="40%" />}
            />
          </ListItem>
        ))}
      </List>
    )
  }

  return (
    <List sx={{ width: '100%', maxHeight: height, overflow: 'auto' }}>
      {items.length > 50 ? (
        <VirtualizedList
          height={height}
          itemCount={items.length}
          itemSize={72} // Standard list item height
          width="100%"
        >
          {renderItem}
        </VirtualizedList>
      ) : (
        items.map((item) => (
          <ListItem
            key={item.id}
            component={onItemClick ? 'button' : 'div'}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          >
            {item.avatar}
            <ListItemText
              primary={item.primary}
              secondary={item.secondary}
            />
            {item.actions}
          </ListItem>
        ))
      )}
    </List>
  )
})

OptimizedList.displayName = 'OptimizedList'

// Optimized Button Component
interface OptimizedButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'text' | 'outlined' | 'contained'
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
  size?: 'small' | 'medium' | 'large'
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  disabled?: boolean
  loading?: boolean
}

export const OptimizedButton = memo<OptimizedButtonProps>(({
  children,
  onClick,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  startIcon,
  endIcon,
  disabled = false,
  loading = false
}) => {
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!loading && !disabled) {
      onClick()
    }
  }, [onClick, loading, disabled])

  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      startIcon={loading ? null : startIcon}
      endIcon={loading ? null : endIcon}
      disabled={disabled || loading}
      onClick={handleClick}
      sx={{
        transition: 'all 0.2s ease-in-out',
        textTransform: 'none',
        fontWeight: 600,
      }}
    >
      {loading ? 'Loading...' : children}
    </Button>
  )
})

OptimizedButton.displayName = 'OptimizedButton'

// Optimized Chip Component
interface OptimizedChipProps {
  label: string
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
  variant?: 'filled' | 'outlined'
  size?: 'small' | 'medium'
  onDelete?: () => void
  onClick?: () => void
  disabled?: boolean
}

export const OptimizedChip = memo<OptimizedChipProps>(({
  label,
  color = 'default',
  variant = 'filled',
  size = 'medium',
  onDelete,
  onClick,
  disabled = false
}) => {
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick()
    }
  }, [onClick, disabled])

  const handleDelete = useCallback(() => {
    if (!disabled && onDelete) {
      onDelete()
    }
  }, [onDelete, disabled])

  return (
    <Chip
      label={label}
      color={color}
      variant={variant}
      size={size}
      onClick={onClick ? handleClick : undefined}
      onDelete={onDelete ? handleDelete : undefined}
      disabled={disabled}
      sx={{
        transition: 'all 0.2s ease-in-out',
        fontWeight: 600,
      }}
    />
  )
})

OptimizedChip.displayName = 'OptimizedChip'

// Performance utilities
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export const useThrottle = <T extends any[]>(
  callback: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  const lastRun = React.useRef(Date.now())

  return useCallback((...args: T) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args)
      lastRun.current = Date.now()
    }
  }, [callback, delay])
}

// HOC for lazy loading
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ComponentType = () => <Skeleton variant="rectangular" width="100%" height={200} />
) => {
  return React.lazy(() => 
    Promise.resolve({ default: Component })
  )
}

// Intersection Observer Hook for lazy loading
export const useIntersectionObserver = (
  elementRef: React.RefObject<Element>,
  { threshold = 0, root = null, rootMargin = '0%' }: IntersectionObserverInit = {}
): IntersectionObserverEntry | undefined => {
  const [entry, setEntry] = React.useState<IntersectionObserverEntry>()

  React.useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      { threshold, root, rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [elementRef, threshold, root, rootMargin])

  return entry
}