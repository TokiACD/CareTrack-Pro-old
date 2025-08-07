import { Box, Typography, BoxProps } from '@mui/material';
import Logo from './Logo';

interface BrandHeaderProps extends BoxProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showLogo?: boolean;
  onClick?: () => void;
}

const textSizeMap = {
  sm: { logo: 'sm' as const, fontSize: '1.25rem' },
  md: { logo: 'md' as const, fontSize: '1.5rem' },
  lg: { logo: 'lg' as const, fontSize: '2rem' }
};

export default function BrandHeader({ 
  size = 'md', 
  showText = true, 
  showLogo = true, 
  onClick, 
  sx, 
  ...props 
}: BrandHeaderProps) {
  const config = textSizeMap[size];
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#0a223c',
        padding: 2,
        borderRadius: 1,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          backgroundColor: '#2c4866',
          transition: 'background-color 0.2s ease-in-out'
        } : {},
        ...sx
      }}
      onClick={onClick}
      {...props}
    >
      {showLogo && <Logo size={config.logo} />}
      {showText && (
        <Typography
          variant="h6"
          component="div"
          sx={{
            color: 'white',
            fontWeight: 600,
            fontSize: config.fontSize,
            fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif'
          }}
        >
          CareTrack Pro
        </Typography>
      )}
    </Box>
  );
}