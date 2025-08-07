import { Box, BoxProps } from '@mui/material';
import logoWhite from '../../assets/images/logo-white.png';

interface LogoProps extends Omit<BoxProps, 'onClick'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

const sizeMap = {
  xs: 24,
  sm: 32, 
  md: 40,
  lg: 48,
  xl: 64
};

export default function Logo({ size = 'md', onClick, sx, ...props }: LogoProps) {
  const logoSize = sizeMap[size];
  
  return (
    <Box
      component="img"
      src={logoWhite}
      alt="CareTrack Pro - Professional Healthcare Management"
      sx={{
        height: logoSize,
        width: 'auto',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...sx
      }}
      onClick={onClick}
      {...props}
    />
  );
}