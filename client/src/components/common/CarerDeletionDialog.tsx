import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material'
import {
  Warning as WarningIcon,
  GetApp as DownloadIcon,
  Gavel as ComplianceIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material'
import { API_ENDPOINTS } from '@caretrack/shared'

export interface CarerDeletionDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  carerName: string
  carerId: string
  isDeleting?: boolean
  isPermanentDelete?: boolean
}

const CarerDeletionDialog: React.FC<CarerDeletionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  carerName,
  carerId,
  isDeleting = false,
  isPermanentDelete = false
}) => {
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [pdfDownloaded, setPdfDownloaded] = useState(false)

  const handleDownloadPDF = async () => {
    try {
      setIsDownloadingPDF(true)
      
      const response = await fetch(`${API_ENDPOINTS.PROGRESS.LIST}/${carerId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${carerName.replace(/[^a-zA-Z0-9]/g, '_')}_CareRecord_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setPdfDownloaded(true)
    } catch (error) {
      console.error('PDF download failed:', error)
      alert('Failed to download PDF. Please try again.')
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  const handleConfirm = () => {
    if (isPermanentDelete && !pdfDownloaded) {
      alert('Please download the PDF before proceeding with permanent deletion.')
      return
    }
    onConfirm()
  }

  const handleClose = () => {
    setPdfDownloaded(false)
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="carer-deletion-dialog-title"
    >
      <DialogTitle 
        id="carer-deletion-dialog-title"
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          color: 'error.main',
          pb: 1
        }}
      >
        <WarningIcon />
        {isPermanentDelete ? 'Permanently Delete Carer' : 'Delete Carer'}
      </DialogTitle>
      
      <DialogContent>
        {/* CQC Compliance Alert */}
        <Alert 
          severity="error" 
          icon={<ComplianceIcon />}
          sx={{ mb: 3 }}
        >
          <Typography fontWeight="bold" sx={{ mb: 1 }}>
            CQC COMPLIANCE REQUIREMENT
          </Typography>
          <Typography variant="body2">
            Before deleting this carer, you must download and securely store their complete care record PDF. 
            This document must be retained for <strong>6 years minimum</strong> as required by CQC regulations.
          </Typography>
        </Alert>

        {/* Carer Information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Carer: {carerName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ID: {carerId}
          </Typography>
        </Box>

        {/* PDF Download Section */}
        <Box sx={{ mb: 3, p: 2, border: '2px dashed', borderColor: 'primary.main', borderRadius: 1 }}>
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <AssignmentIcon color="primary" />
            <Typography variant="h6">
              Download Complete Care Record
            </Typography>
            {pdfDownloaded && (
              <Chip 
                label="Downloaded" 
                color="success" 
                size="small" 
              />
            )}
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            This PDF contains:
          </Typography>
          <Box component="ul" sx={{ margin: 0, paddingLeft: 2, mb: 2 }}>
            <li><Typography variant="body2">Complete carer details and contact information</Typography></li>
            <li><Typography variant="body2">Progress tracking across all care packages</Typography></li>
            <li><Typography variant="body2">Full assessment history with questions and answers</Typography></li>
            <li><Typography variant="body2">Competency ratings and assessment results</Typography></li>
            <li><Typography variant="body2">Assessor details and completion dates</Typography></li>
          </Box>

          <Button
            variant="contained"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            startIcon={isDownloadingPDF ? <CircularProgress size={16} /> : <DownloadIcon />}
            fullWidth
            sx={{ mb: 1 }}
          >
            {isDownloadingPDF ? 'Generating PDF...' : 'Download Care Record PDF'}
          </Button>
          
          {pdfDownloaded && (
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="body2">
                ✅ PDF downloaded successfully. Please ensure it is stored securely in the carer's physical file.
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Action Warning */}
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            {isPermanentDelete ? 'PERMANENT DELETION WARNING:' : 'DELETION WARNING:'}
          </Typography>
          <Typography variant="body2">
            {isPermanentDelete ? (
              <>
                This action will <strong>permanently delete</strong> {carerName} and all associated data from the system. 
                This action <strong>cannot be undone</strong>. The carer will be completely removed from the database.
              </>
            ) : (
              <>
                This will move {carerName} to the Recycle Bin. The carer can be restored within the recycle bin system.
                However, you must download their care record now for CQC compliance.
              </>
            )}
          </Typography>
        </Alert>

        {/* Retention Requirements */}
        <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, color: 'info.contrastText' }}>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            CQC Record Retention Requirements:
          </Typography>
          <Typography variant="body2">
            • Store PDF securely in carer's physical file<br />
            • Retain for minimum 6 years from deletion date<br />
            • Ensure GDPR compliance and appropriate access controls<br />
            • Keep readily available for CQC inspections
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={isDeleting}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={isDeleting || (isPermanentDelete && !pdfDownloaded)}
          startIcon={isDeleting ? <CircularProgress size={16} /> : undefined}
        >
          {isDeleting ? 'Deleting...' : 
           isPermanentDelete ? 'Permanently Delete Carer' : 'Delete Carer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CarerDeletionDialog