import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material';

export interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string | React.ReactNode;
  sortable?: boolean;
  mobile?: {
    priority: 'high' | 'medium' | 'low' | 'hide';
    label?: string;
  };
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  dense?: boolean;
  maxHeight?: string | number;
  stickyHeader?: boolean;
  onRowClick?: (row: any, index: number) => void;
  mobileCardRenderer?: (row: any, index: number) => React.ReactNode;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  columns,
  data,
  dense = false,
  maxHeight,
  stickyHeader = false,
  onRowClick,
  mobileCardRenderer,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Filter columns based on mobile priorities
  const getVisibleColumns = () => {
    if (isSmallMobile) {
      return columns.filter(col => 
        !col.mobile || col.mobile.priority === 'high'
      );
    }
    if (isMobile) {
      return columns.filter(col => 
        !col.mobile || ['high', 'medium'].includes(col.mobile.priority)
      );
    }
    return columns;
  };

  const visibleColumns = getVisibleColumns();

  // Mobile card view
  const renderMobileCard = (row: any, index: number) => {
    if (mobileCardRenderer) {
      return mobileCardRenderer(row, index);
    }

    return (
      <Card
        key={index}
        elevation={1}
        sx={{
          mb: 2,
          cursor: onRowClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease-in-out',
          '&:hover': onRowClick ? {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4],
          } : {},
        }}
        onClick={() => onRowClick?.(row, index)}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1}>
            {columns.map((column) => {
              const value = row[column.id];
              if (value === undefined || value === null || value === '') return null;

              const displayValue = column.format ? column.format(value) : value;
              const mobileLabel = column.mobile?.label || column.label;

              return (
                <Box key={column.id}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
                  >
                    {mobileLabel}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: column.mobile?.priority === 'high' ? 600 : 400,
                    }}
                  >
                    {displayValue}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  // Mobile view
  if (isMobile) {
    return (
      <Box sx={{ width: '100%' }}>
        {data.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: theme.palette.grey[50],
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No data available
            </Typography>
          </Paper>
        ) : (
          <Box>
            {data.map((row, index) => renderMobileCard(row, index))}
          </Box>
        )}
      </Box>
    );
  }

  // Desktop table view
  return (
    <TableContainer
      component={Paper}
      sx={{
        maxHeight,
        '& .MuiTableCell-root': {
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Table
        stickyHeader={stickyHeader}
        size={dense ? 'small' : 'medium'}
        sx={{
          minWidth: 650,
          '& .MuiTableCell-head': {
            backgroundColor: theme.palette.grey[50],
            fontWeight: 600,
            fontSize: '0.875rem',
            color: theme.palette.text.primary,
          },
        }}
      >
        <TableHead>
          <TableRow>
            {visibleColumns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
                sx={{
                  cursor: column.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  '&:hover': column.sortable ? {
                    backgroundColor: theme.palette.action.hover,
                  } : {},
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleColumns.length}
                align="center"
                sx={{ py: 6 }}
              >
                <Typography variant="body2" color="text.secondary">
                  No data available
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow
                hover={!!onRowClick}
                key={index}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:nth-of-type(odd)': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
                onClick={() => onRowClick?.(row, index)}
              >
                {visibleColumns.map((column) => {
                  const value = row[column.id];
                  const displayValue = column.format ? column.format(value) : value;

                  return (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      sx={{
                        fontSize: '0.875rem',
                        py: dense ? 1 : 1.5,
                      }}
                    >
                      {displayValue}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Status chip formatter for common use cases
export const StatusChip: React.FC<{
  status: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}> = ({ status, color = 'primary' }) => (
  <Chip
    label={status}
    color={color}
    size="small"
    sx={{
      fontWeight: 600,
      minWidth: 80,
      '& .MuiChip-label': {
        px: 1.5,
      },
    }}
  />
);

// Date formatter
export const formatDate = (date: string | Date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Currency formatter
export const formatCurrency = (amount: number, currency = 'USD') => {
  if (typeof amount !== 'number') return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Truncate text formatter
export const truncateText = (text: string, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export default ResponsiveTable;