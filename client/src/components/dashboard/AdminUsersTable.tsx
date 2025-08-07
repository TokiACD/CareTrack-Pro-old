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
import { AdminUser as SharedAdminUser } from '@caretrack/shared'

interface ExtendedAdminUser extends SharedAdminUser {
  invitedBy?: string
}

interface AdminUsersTableProps {
  admins: ExtendedAdminUser[]
  isLoading: boolean
  error: any
  onMenuClick: (event: React.MouseEvent<HTMLButtonElement>, admin: ExtendedAdminUser) => void
}

const AdminUsersTable: React.FC<AdminUsersTableProps> = ({
  admins,
  isLoading,
  error,
  onMenuClick
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
        Failed to load admin users. Please try again.
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
            <TableCell>Status</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id} hover>
              <TableCell>{admin.name}</TableCell>
              <TableCell>{admin.email}</TableCell>
              <TableCell>
                <Chip 
                  size="small"
                  color={admin.isActive ? 'success' : 'default'}
                  label={admin.isActive ? 'Active' : 'Inactive'}
                />
              </TableCell>
              <TableCell>
                {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
              </TableCell>
              <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={(e) => onMenuClick(e, admin)}
                >
                  <MoreVertIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {admins.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography color="textSecondary">
                  No admin users found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default AdminUsersTable