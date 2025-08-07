import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { CheckCircle, Send as SendIcon } from '@mui/icons-material';
import { FormSection } from '../common/forms';

interface CarePackage {
  id: string;
  name: string;
  postcode: string;
}

interface ShiftFormData {
  packageId: string;
  date: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  isCompetentOnly: boolean;
}

interface ShiftSummaryStepProps {
  formData: ShiftFormData;
  carePackages: CarePackage[];
  availableCarersCount: number;
  competentCarersCount: number;
  createMutation: {
    isPending: boolean;
    data?: any;
  };
  sendMutation: {
    isPending: boolean;
  };
  onSendShift: () => void;
}

export const ShiftSummaryStep: React.FC<ShiftSummaryStepProps> = ({
  formData,
  carePackages,
  availableCarersCount,
  competentCarersCount,
  createMutation,
  sendMutation,
  onSendShift
}) => {
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const selectedPackage = carePackages?.find(p => p.id === formData.packageId);
  const carersToReceive = formData.isCompetentOnly ? competentCarersCount : availableCarersCount;

  if (createMutation.isPending) {
    return (
      <FormSection>
        <Box textAlign="center" py={4}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Creating shift...</Typography>
        </Box>
      </FormSection>
    );
  }

  if (!createMutation.data?.shift) {
    return (
      <FormSection>
        <Alert severity="error">
          Failed to create shift. Please try again.
        </Alert>
      </FormSection>
    );
  }

  return (
    <FormSection>
      <Box textAlign="center">
        <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
        
        <Typography variant="h5" gutterBottom>
          Shift Created Successfully!
        </Typography>
        
        <Typography variant="body1" paragraph>
          Your shift has been created and is ready to send to the selected carers.
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>
            Shift Summary:
          </Typography>
          
          <Box sx={{ '& > *': { mb: 1 } }}>
            <Typography>
              <strong>Package:</strong> {selectedPackage?.name} ({selectedPackage?.postcode})
            </Typography>
            
            <Typography>
              <strong>Date:</strong> {formData.date?.toLocaleDateString()}
            </Typography>
            
            <Typography>
              <strong>Time:</strong> {formatTime(formData.startTime!)} - {formatTime(formData.endTime!)}
            </Typography>
            
            <Typography>
              <strong>Type:</strong> {formData.isCompetentOnly ? 'Competent Only' : 'Non-Competent'}
            </Typography>
            
            <Typography>
              <strong>Carers to Receive Shift:</strong> {carersToReceive}
            </Typography>
          </Box>
        </Paper>

        <Button
          variant="contained"
          size="large"
          onClick={onSendShift}
          disabled={sendMutation.isPending || carersToReceive === 0}
          startIcon={sendMutation.isPending ? <CircularProgress size={20} /> : <SendIcon />}
          sx={{ minWidth: 200 }}
        >
          {sendMutation.isPending 
            ? 'Sending...' 
            : `Send to ${carersToReceive} Carer${carersToReceive !== 1 ? 's' : ''}`
          }
        </Button>

        {carersToReceive === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            No carers available to receive this shift. Please review the requirements.
          </Alert>
        )}
      </Box>
    </FormSection>
  );
};