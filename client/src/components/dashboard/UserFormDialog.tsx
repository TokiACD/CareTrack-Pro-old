import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material'
import { AdminUser as SharedAdminUser, Carer as SharedCarer } from '@caretrack/shared'

interface ExtendedAdminUser extends SharedAdminUser {
  invitedBy?: string
}

interface ExtendedCarer extends SharedCarer {
  competencyStatus: 'COMPETENT' | 'NEEDS_SUPPORT' | 'NOT_ASSESSED'
  assignedPackages: Array<{ id: string; name: string }>
  totalCompetencies: number
  fullyAssessed: boolean
}

interface FormData {
  name?: string
  email: string
  phone?: string
  isActive: boolean
}

interface UserFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  editingUser: ExtendedAdminUser | ExtendedCarer | null
  userType: 'admin' | 'carer'
  formData: FormData
  setFormData: (data: FormData) => void
  handleEmailChange: (email: string) => void
  handlePhoneChange: (phone: string) => void
  emailValidationError: string
  phoneValidationError: string
  isSubmitting: boolean
}

const UserFormDialog: React.FC<UserFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  editingUser,
  userType,
  formData,
  setFormData,
  handleEmailChange,
  handlePhoneChange,
  emailValidationError,
  phoneValidationError,
  isSubmitting
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>
        {editingUser 
          ? `Edit ${userType === 'admin' ? 'Admin User' : 'Carer'}` 
          : `Invite New ${userType === 'admin' ? 'Admin User' : 'Carer'}`
        }
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <TextField
            label="Full Name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            fullWidth
            required
            error={!!emailValidationError}
            helperText={emailValidationError}
          />
          {editingUser && (
            <TextField
              label="Phone Number"
              value={formData.phone || ''}
              onChange={(e) => handlePhoneChange(e.target.value)}
              fullWidth
              required
              error={!!phoneValidationError}
              helperText={phoneValidationError || 'Enter phone number with country code (e.g., +44 20 1234 5678)'}
              placeholder="+44 20 1234 5678"
            />
          )}
          {!editingUser && (
            <Alert severity="info" sx={{ mt: 1 }}>
              An invitation email will be sent with instructions to set up their password. Users will enter their phone number during account setup.
            </Alert>
          )}
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            }
            label="Active"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onSubmit}
          variant="contained"
          disabled={isSubmitting || !!emailValidationError || !!phoneValidationError}
        >
          {isSubmitting ? (
            <CircularProgress size={20} />
          ) : (
            editingUser ? 'Update' : 'Send Invitation'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UserFormDialog