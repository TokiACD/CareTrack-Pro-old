import React from 'react';
import { Container } from '@mui/material';
import { AdminPageLayout } from '../components/common/AdminPageLayout';
import CarePackagesCard from '../components/dashboard/CarePackagesCard';

const CarePackagesPage: React.FC = () => {
  return (
    <AdminPageLayout pageTitle="Care Packages">
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <CarePackagesCard />
      </Container>
    </AdminPageLayout>
  );
};

export default CarePackagesPage;