import React from 'react';
import { Container } from '@mui/material';
import { AdminPageLayout } from '../components/common/AdminPageLayout';
import ShiftSenderCard from '../components/dashboard/ShiftSenderCard';

const ShiftSenderPage: React.FC = () => {
  return (
    <AdminPageLayout pageTitle="Shift Distribution">
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <ShiftSenderCard />
      </Container>
    </AdminPageLayout>
  );
};

export default ShiftSenderPage;