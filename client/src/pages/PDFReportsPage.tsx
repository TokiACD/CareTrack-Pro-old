import React from 'react';
import { Container } from '@mui/material';
import { AdminPageLayout } from '../components/common/AdminPageLayout';
import PDFReportsCard from '../components/dashboard/PDFReportsCard';

const PDFReportsPage: React.FC = () => {
  return (
    <AdminPageLayout pageTitle="Care Records">
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <PDFReportsCard />
      </Container>
    </AdminPageLayout>
  );
};

export default PDFReportsPage;