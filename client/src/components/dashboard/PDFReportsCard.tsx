import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination
} from '@mui/material'
import {
  Search as SearchIcon,
  GetApp as DownloadIcon,
  Assignment as ReportIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '../../services/api'
import { API_ENDPOINTS, Carer as SharedCarer } from '@caretrack/shared'

// Use the shared Carer type
type Carer = SharedCarer

const PDFReportsCard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [downloadingCarerId, setDownloadingCarerId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'warning'
  }>({
    open: false,
    message: '',
    severity: 'success'
  })

  // Fetch carers data
  const { data: carersData, isLoading, error } = useQuery({
    queryKey: ['carers-for-pdf', page, searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '10')
      if (searchTerm) {
        params.set('search', searchTerm)
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      
      const url = `/api/carers?${params.toString()}`
      return await apiService.getFullResponse(url)
    }
  })

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning') => {
    setNotification({
      open: true,
      message,
      severity
    })
  }

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }))
  }

  const handleDownloadPDF = async (carer: Carer) => {
    try {
      setDownloadingCarerId(carer.id)
      
      // Use the correct API endpoint structure
      const response = await fetch(`/api/progress/${carer.id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
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
      link.download = `${carer.name.replace(/[^a-zA-Z0-9]/g, '_')}_CareRecord_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showNotification(`Care record PDF for ${carer.name} downloaded successfully`, 'success')
    } catch (error) {
      console.error('PDF download failed:', error)
      showNotification(`Failed to download PDF for ${carer.name}. Please try again.`, 'error')
    } finally {
      setDownloadingCarerId(null)
    }
  }

  const carers = carersData?.data || []
  const pagination = carersData?.pagination || { page: 1, totalPages: 1, total: 0 }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load carers data. Please try again.
      </Alert>
    )
  }

  return (
    <>
      <Card elevation={2}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <ReportIcon color="error" />
              <Typography variant="h5" component="div">
                PDF Reports
              </Typography>
            </Box>
          }
          subheader="Generate and download complete care record PDFs for carers"
        />
        
        <CardContent>
          {/* CQC Compliance Notice */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              CQC Compliance PDFs
            </Typography>
            <Typography variant="body2">
              These comprehensive care record PDFs contain all carer information, progress tracking, 
              assessment history, and competency ratings. Use for CQC inspections, record retention, 
              and administrative purposes.
            </Typography>
          </Alert>

          {/* Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search carers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Carers</MenuItem>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="inactive">Inactive Only</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Loading State */}
          {isLoading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {/* Carers Table */}
          {!isLoading && (
            <>
              {carers.length === 0 ? (
                <Alert severity="info" icon={<PersonIcon />}>
                  <Typography variant="body1">
                    No carers found. {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'No carers have been added yet.'}
                  </Typography>
                </Alert>
              ) : (
                <>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Carer</TableCell>
                          <TableCell>Contact</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Added</TableCell>
                          <TableCell align="center">PDF Report</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {carers.map((carer: Carer) => (
                          <TableRow key={carer.id}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {carer.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {carer.id.slice(0, 8)}...
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {carer.email}
                                </Typography>
                                {carer.phone && (
                                  <Typography variant="caption" color="text.secondary">
                                    {carer.phone}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={carer.isActive ? 'Active' : 'Inactive'}
                                size="small"
                                color={carer.isActive ? 'success' : 'default'}
                                icon={carer.isActive ? <CheckCircleIcon /> : undefined}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(carer.createdAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleDownloadPDF(carer)}
                                disabled={downloadingCarerId === carer.id}
                                startIcon={
                                  downloadingCarerId === carer.id ? 
                                    <CircularProgress size={16} /> : 
                                    <DownloadIcon />
                                }
                                sx={{ minWidth: 120 }}
                              >
                                {downloadingCarerId === carer.id ? 'Generating...' : 'Download PDF'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <Box display="flex" justifyContent="center" mt={3}>
                      <Pagination
                        count={pagination.totalPages}
                        page={page}
                        onChange={(_, newPage) => setPage(newPage)}
                        color="primary"
                      />
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {/* PDF Content Information */}
          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              PDF Report Contents:
            </Typography>
            <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
              <li><Typography variant="body2">Complete carer details and contact information</Typography></li>
              <li><Typography variant="body2">Progress tracking across all assigned care packages</Typography></li>
              <li><Typography variant="body2">Full assessment history with questions and answers</Typography></li>
              <li><Typography variant="body2">Competency ratings and assessment results</Typography></li>
              <li><Typography variant="body2">Assessor details and completion dates</Typography></li>
              <li><Typography variant="body2">Professional formatting suitable for CQC inspections</Typography></li>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default PDFReportsCard