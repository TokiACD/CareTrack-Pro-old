import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Box
} from '@mui/material'
import { MoreVert as MoreVertIcon } from '@mui/icons-material'
import { Carer as SharedCarer } from '@caretrack/shared'

interface ExtendedCarer extends SharedCarer {
  competencyStatus: 'COMPETENT' | 'NEEDS_SUPPORT' | 'NOT_ASSESSED'
  assignedPackages: Array<{ id: string; name: string }>
  totalCompetencies: number
  fullyAssessed: boolean
}

interface CarersTableProps {
  carers: ExtendedCarer[]
  isLoading: boolean
  error: any
  onMenuClick: (event: React.MouseEvent<HTMLButtonElement>, carer: ExtendedCarer) => void
  getCompetencyChip: (status: string) => React.ReactNode
}

const CarersTable: React.FC<CarersTableProps> = ({
  carers,
  isLoading,
  error,
  onMenuClick,
  getCompetencyChip
}) => {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load carers. Please try again.
      </Alert>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Competency Status</TableCell>
            <TableCell>Assigned Packages</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {carers.map((carer) => (
            <TableRow key={carer.id} hover>
              <TableCell>{carer.name}</TableCell>
              <TableCell>{carer.email}</TableCell>
              <TableCell>{getCompetencyChip(carer.competencyStatus)}</TableCell>
              <TableCell>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {carer.assignedPackages.map((pkg: { id: string; name: string }) => (
                    <Chip 
                      key={pkg.id} 
                      size="small" 
                      variant="outlined" 
                      label={pkg.name} 
                    />
                  ))}
                  {carer.assignedPackages.length === 0 && (
                    <Typography variant="body2" color="textSecondary">
                      No packages assigned
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip 
                  size="small"
                  color={carer.isActive ? 'success' : 'default'}
                  label={carer.isActive ? 'Active' : 'Inactive'}
                />
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={(e) => onMenuClick(e, carer)}
                >
                  <MoreVertIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {carers.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography color="textSecondary">
                  No carers found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default CarersTable