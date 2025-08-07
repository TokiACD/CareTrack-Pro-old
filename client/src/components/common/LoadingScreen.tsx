import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

export const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress size={60} thickness={4} />
      <Typography variant="h6" color="primary">
        Loading CareTrack Pro...
      </Typography>
    </Box>
  )
}