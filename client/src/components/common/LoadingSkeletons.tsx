import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid
} from '@mui/material';

export const RotaTableSkeleton: React.FC = () => (
  <Card>
    <CardContent>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Skeleton variant="text" width={80} />
              </TableCell>
              {Array.from({ length: 7 }).map((_, index) => (
                <TableCell key={index} align="center">
                  <Box>
                    <Skeleton variant="text" width={60} />
                    <Skeleton variant="text" width={30} />
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 2 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell>
                  <Skeleton variant="text" width={100} />
                </TableCell>
                {Array.from({ length: 7 }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton variant="rectangular" height={80} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

export const RotaCardSkeleton: React.FC = () => (
  <Grid container spacing={2}>
    {Array.from({ length: 7 }).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={index}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Skeleton variant="text" width={60} />
              <Skeleton variant="circular" width={24} height={24} />
            </Box>
            <Box display="flex" flexDirection="column" gap={1}>
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="rectangular" height={60} />
              <Skeleton variant="rectangular" height={60} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export const CarePackageCardsSkeleton: React.FC = () => (
  <Box display="flex" flexWrap="wrap" gap={2}>
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} sx={{ minWidth: 200, flex: 1 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={120} />
          </Box>
          <Skeleton variant="text" width={80} />
          <Box mt={2}>
            <Skeleton variant="rectangular" height={20} width={60} />
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
);

export const CarerTabsSkeleton: React.FC = () => (
  <Box>
    <Box display="flex" mb={2}>
      <Skeleton variant="text" width={100} height={40} />
      <Skeleton variant="text" width={100} height={40} sx={{ ml: 2 }} />
    </Box>
    <Box display="flex" flexDirection="column" gap={1}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} variant="outlined">
          <CardContent sx={{ p: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box flex={1}>
                <Skeleton variant="text" width={120} />
                <Skeleton variant="text" width={80} />
              </Box>
              <Skeleton variant="rectangular" width={60} height={20} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  </Box>
);

export const WeekNavigationSkeleton: React.FC = () => (
  <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
    <Box display="flex" alignItems="center" gap={2}>
      <Skeleton variant="circular" width={32} height={32} />
      <Skeleton variant="text" width={200} />
      <Skeleton variant="circular" width={32} height={32} />
    </Box>
    <Box display="flex" gap={1}>
      <Skeleton variant="rectangular" width={80} height={32} />
      <Skeleton variant="rectangular" width={80} height={32} />
    </Box>
  </Box>
);

export const PerformanceMetricsSkeleton: React.FC = () => (
  <Paper sx={{ p: 3, mt: 1 }}>
    <Box display="flex" alignItems="center" gap={1} mb={2}>
      <Skeleton variant="circular" width={24} height={24} />
      <Skeleton variant="text" width={200} />
    </Box>
    <Box 
      display="grid" 
      gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }}
      gap={3}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Skeleton variant="text" width={100} />
          <Skeleton variant="text" width={60} height={32} />
          <Skeleton variant="text" width={80} />
        </Box>
      ))}
    </Box>
  </Paper>
);

interface SmartLoadingProps {
  type: 'rota-table' | 'rota-cards' | 'care-packages' | 'carer-tabs' | 'week-nav' | 'performance';
  count?: number;
  animate?: boolean;
}

export const SmartLoading: React.FC<SmartLoadingProps> = ({ 
  type, 
  count = 1, 
  animate = true 
}) => {
  const getSkeletonComponent = () => {
    switch (type) {
      case 'rota-table':
        return <RotaTableSkeleton />;
      case 'rota-cards':
        return <RotaCardSkeleton />;
      case 'care-packages':
        return <CarePackageCardsSkeleton />;
      case 'carer-tabs':
        return <CarerTabsSkeleton />;
      case 'week-nav':
        return <WeekNavigationSkeleton />;
      case 'performance':
        return <PerformanceMetricsSkeleton />;
      default:
        return <Skeleton variant="rectangular" width="100%" height={200} />;
    }
  };

  return (
    <Box sx={{ opacity: animate ? 1 : 0.7 }}>
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} mb={index < count - 1 ? 2 : 0}>
          {getSkeletonComponent()}
        </Box>
      ))}
    </Box>
  );
};