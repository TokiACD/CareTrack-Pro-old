import React from 'react';
import { Container } from '@mui/material';
import { AdminPageLayout } from '../components/common/AdminPageLayout';
import UsersCard from '../components/dashboard/UsersCard';

const UsersPage: React.FC = () => {
  return (
    <AdminPageLayout pageTitle="User Management">
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <UsersCard />
      </Container>
    </AdminPageLayout>
  );
};

export default UsersPage;