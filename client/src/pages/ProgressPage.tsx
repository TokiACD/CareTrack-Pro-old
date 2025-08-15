import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  TrendingUp as ProgressIcon
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import ProgressCard from '../components/dashboard/ProgressCard';
import { AdminPageLayout } from '../components/common/AdminPageLayout';

const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get filter state from navigation
  const filterReadyForAssessment = location.state?.filterReadyForAssessment || false;

  return (
    <AdminPageLayout pageTitle="Progress Tracking">
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <ProgressCard filterReadyForAssessment={filterReadyForAssessment} />
      </Container>
    </AdminPageLayout>
  );
};

export default ProgressPage;