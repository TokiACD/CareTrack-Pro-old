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
import {
  Refresh as RefreshIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import { Invitation as SharedInvitation } from '@caretrack/shared'

interface ExtendedInvitation extends Omit<SharedInvitation, 'invitedByAdmin'> {
  invitedByAdmin: {
    name: string
  }
}

interface InvitationsTableProps {
  invitations: ExtendedInvitation[]
  isLoading: boolean
  error: any
  onResendInvitation: (invitationId: string) => void
  onCancelInvitation: (invitationId: string) => void
  getInvitationStatusChip: (status: string) => React.ReactNode
  isResendingInvitation: boolean
  isCancellingInvitation: boolean
}

const InvitationsTable: React.FC<InvitationsTableProps> = ({
  invitations,
  isLoading,
  error,
  onResendInvitation,
  onCancelInvitation,
  getInvitationStatusChip,
  isResendingInvitation,
  isCancellingInvitation
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
        Failed to load invitations. Please try again.
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
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Invited By</TableCell>
            <TableCell>Invited Date</TableCell>
            <TableCell>Expires</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id} hover>
              <TableCell>
                {invitation.name}
              </TableCell>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>
                <Chip 
                  size="small"
                  color={invitation.userType === 'ADMIN' ? 'primary' : 'secondary'}
                  label={invitation.userType === 'ADMIN' ? 'Admin' : 'Carer'}
                />
              </TableCell>
              <TableCell>{getInvitationStatusChip(invitation.status)}</TableCell>
              <TableCell>{invitation.invitedByAdmin.name}</TableCell>
              <TableCell>{new Date(invitation.invitedAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                  {new Date() > new Date(invitation.expiresAt) && (
                    <Chip size="small" color="error" label="Expired" />
                  )}
                </Box>
              </TableCell>
              <TableCell align="right">
                <Box display="flex" gap={0.5} justifyContent="flex-end">
                  {invitation.status === 'PENDING' && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => onResendInvitation(invitation.id)}
                        disabled={isResendingInvitation}
                        title="Resend invitation"
                      >
                        <RefreshIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onCancelInvitation(invitation.id)}
                        disabled={isCancellingInvitation}
                        title="Cancel invitation"
                        sx={{ color: 'error.main' }}
                      >
                        <CancelIcon />
                      </IconButton>
                    </>
                  )}
                  {invitation.status === 'ACCEPTED' && (
                    <Typography variant="body2" color="textSecondary">
                      -
                    </Typography>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {invitations.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography color="textSecondary">
                  No invitations found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default InvitationsTable