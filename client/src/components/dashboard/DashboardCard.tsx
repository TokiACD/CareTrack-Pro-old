import React from 'react'
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  alpha,
} from '@mui/material'

interface DashboardCardProps {
  title: string
  description: string
  icon: string
  color: string
  onClick: () => void
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon,
  color,
  onClick,
}) => {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          '& .card-icon': {
            transform: 'scale(1.1)',
          },
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{
          height: '100%',
          p: 2,
        }}
      >
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Icon */}
          <Box
            className="card-icon"
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.1),
              mb: 2,
              fontSize: '2rem',
              transition: 'transform 0.3s ease-in-out',
            }}
          >
            {icon}
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            component="h3"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              flexGrow: 1,
              lineHeight: 1.4,
            }}
          >
            {description}
          </Typography>

          {/* Color accent */}
          <Box
            sx={{
              width: '100%',
              height: 4,
              bgcolor: color,
              borderRadius: 2,
              mt: 2,
            }}
          />
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default DashboardCard