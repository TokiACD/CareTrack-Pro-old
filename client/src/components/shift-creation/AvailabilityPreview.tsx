import React from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Chip,
  CircularProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Info as InfoIcon
} from '@mui/icons-material';
import { FormSection } from '../common/forms';

interface AvailabilityCarer {
  id: string;
  name: string;
  email: string;
  availability: {
    isAvailable: boolean;
    conflicts: Array<{
      type: string;
      message: string;
    }>;
    competencyMatch: {
      isCompetent: boolean;
      requiredTasks: string[];
      competentTasks: string[];
      missingCompetencies: string[];
    };
  };
}

interface AvailabilityData {
  availableCarers: AvailabilityCarer[];
  availableCount: number;
  competentCount: number;
  totalCarers: number;
}

interface AvailabilityPreviewProps {
  availability: AvailabilityData | null;
  loading: boolean;
  formData: {
    isCompetentOnly: boolean;
  };
}

export const AvailabilityPreview: React.FC<AvailabilityPreviewProps> = ({
  availability,
  loading,
  formData
}) => {
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const getAvailableCarers = React.useCallback(() => {
    if (!availability?.availableCarers) return [];
    return formData.isCompetentOnly 
      ? availability.availableCarers.filter(
          (c: AvailabilityCarer) => c.availability.isAvailable && c.availability.competencyMatch.isCompetent
        )
      : availability.availableCarers.filter(
          (c: AvailabilityCarer) => c.availability.isAvailable
        );
  }, [availability, formData.isCompetentOnly]);

  if (loading) {
    return (
      <FormSection>
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Checking availability...</Typography>
        </Box>
      </FormSection>
    );
  }

  if (!availability) {
    return (
      <FormSection>
        <Alert severity="info">
          Complete the previous steps to check carer availability.
        </Alert>
      </FormSection>
    );
  }

  const availableCarers = getAvailableCarers();
  const competentCarersCount = formData.isCompetentOnly 
    ? availableCarers.filter(c => c.availability.competencyMatch.isCompetent).length
    : undefined;

  return (
    <FormSection
      title="Carer Availability"
      subtitle="Review available carers for this shift"
    >
      <Box>
        <Alert severity="success" sx={{ mb: 3 }}>
          <strong>{availability.availableCount || 0}</strong> carers are available for this shift.
          {formData.isCompetentOnly && (
            <> <strong>{availability.competentCount || 0}</strong> meet competency requirements.</>
          )}
        </Alert>

        <Button
          variant="outlined"
          onClick={() => setPreviewOpen(true)}
          sx={{ mb: 2 }}
          startIcon={<InfoIcon />}
        >
          Preview All Carers ({availability.totalCarers || 0})
        </Button>

        <Typography variant="h6" gutterBottom>
          Available Carers ({availableCarers.length})
        </Typography>
        
        {!formData.isCompetentOnly && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Non-Competent Shift:</strong> All available carers will automatically receive this shift.
          </Alert>
        )}
        
        {formData.isCompetentOnly && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Competent Shift:</strong> Only carers meeting competency requirements will automatically receive this shift.
          </Alert>
        )}
        
        {availableCarers.length > 0 ? (
          <>
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
              <List>
                {availableCarers.map((carer: AvailabilityCarer) => (
                  <ListItem key={carer.id} divider>
                    <ListItemText
                      primary={carer.name}
                      secondary={carer.email}
                    />
                    <Box>
                      {carer.availability.competencyMatch.isCompetent ? (
                        <Chip label="Competent - Will Receive Shift" size="small" color="success" />
                      ) : formData.isCompetentOnly ? (
                        <Chip label="Not Competent - Won't Receive" size="small" color="error" />
                      ) : (
                        <Chip label="Training Available - Will Receive" size="small" color="info" />
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Paper>

            <Box sx={{ mt: 2 }}>
              {formData.isCompetentOnly ? (
                <Alert severity="success">
                  This shift will be sent to {availableCarers.filter(c => c.availability.competencyMatch.isCompetent).length} competent carers.
                </Alert>
              ) : (
                <Alert severity="success">
                  This shift will be sent to all {availableCarers.length} available carers.
                </Alert>
              )}
            </Box>
          </>
        ) : (
          <Alert severity="warning">
            No available carers found for this shift configuration.
          </Alert>
        )}
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Carer Availability Preview</DialogTitle>
        <DialogContent>
          <List>
            {availability.availableCarers?.map((carer: AvailabilityCarer) => (
              <ListItem key={carer.id} divider>
                <ListItemIcon>
                  {carer.availability.isAvailable ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Warning color="warning" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={carer.name}
                  secondary={
                    <Box>
                      <Typography variant="body2">{carer.email}</Typography>
                      {!carer.availability.isAvailable && 
                        carer.availability.conflicts.map((conflict, idx) => (
                          <Typography key={idx} variant="caption" color="error" display="block">
                            {conflict.message}
                          </Typography>
                        ))
                      }
                      {carer.availability.competencyMatch && 
                        !carer.availability.competencyMatch.isCompetent && (
                          <Typography variant="caption" color="warning" display="block">
                            Missing: {carer.availability.competencyMatch.missingCompetencies.join(', ')}
                          </Typography>
                        )
                      }
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </FormSection>
  );
};