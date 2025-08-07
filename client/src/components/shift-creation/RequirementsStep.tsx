import React from 'react';
import { Grid, Alert, Box, Chip, Checkbox, ListItemText, MenuItem } from '@mui/material';
import { FormSelectField, FormSection } from '../common/forms';

interface Task {
  id: string;
  name: string;
  targetCount: number;
  isActive: boolean;
}

interface RequirementsStepProps {
  formData: {
    requiredCompetencies: string[];
    isCompetentOnly: boolean;
  };
  onChange: (updates: { requiredCompetencies: string[] }) => void;
  tasks: Task[];
  tasksLoading: boolean;
  errors: Record<string, string>;
}

export const RequirementsStep: React.FC<RequirementsStepProps> = ({
  formData,
  onChange,
  tasks,
  tasksLoading,
  errors
}) => {
  const taskOptions = React.useMemo(() =>
    tasks?.map(task => ({
      value: task.id,
      label: task.name
    })) || [],
    [tasks]
  );

  if (!formData.isCompetentOnly) {
    return (
      <FormSection
        title="Shift Requirements"
        subtitle="Configure competency requirements for this shift"
      >
        <Alert severity="info">
          <strong>Non-Competent Shift:</strong> All available carers will be shown with their competency information as "More Info". 
          You can review their skills before selecting who receives the shift.
        </Alert>
      </FormSection>
    );
  }

  return (
    <FormSection
      title="Required Competencies"
      subtitle="Select tasks that require competency for this shift"
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="warning">
            <strong>Competent Shift:</strong> Select required tasks. Only carers competent in ALL selected tasks will be shown.
          </Alert>
        </Grid>
        
        <Grid item xs={12}>
          <FormSelectField
            name="requiredCompetencies"
            label="Required Tasks/Competencies"
            value={formData.requiredCompetencies}
            onChange={(value) => onChange({ requiredCompetencies: value as string[] })}
            options={taskOptions}
            multiple
            error={errors.requiredCompetencies}
            disabled={tasksLoading}
            placeholder="Select required tasks"
            displayEmpty
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((taskId) => {
                  const task = tasks?.find((t: Task) => t.id === taskId);
                  return (
                    <Chip
                      key={taskId}
                      label={task?.name || taskId}
                      size="small"
                      color="primary"
                    />
                  );
                })}
              </Box>
            )}
          />
        </Grid>
      </Grid>
    </FormSection>
  );
};