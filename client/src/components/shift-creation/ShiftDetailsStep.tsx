import React from 'react';
import { Grid, Alert } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { FormSelectField, FormSection } from '../common/forms';
import { FORM_CONSTANTS } from '../../constants/ui';

interface CarePackage {
  id: string;
  name: string;
  postcode: string;
  isActive: boolean;
}

interface ShiftFormData {
  packageId: string;
  date: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  expiresAt: Date | null;
  isCompetentOnly: boolean;
}

interface ShiftDetailsStepProps {
  formData: ShiftFormData;
  onChange: (updates: Partial<ShiftFormData>) => void;
  carePackages: CarePackage[];
  packagesLoading: boolean;
  shiftType: 'NON_COMPETENT' | 'COMPETENT';
  errors: Record<string, string>;
}

export const ShiftDetailsStep: React.FC<ShiftDetailsStepProps> = ({
  formData,
  onChange,
  carePackages,
  packagesLoading,
  shiftType,
  errors
}) => {
  const packageOptions = React.useMemo(() =>
    carePackages?.map(pkg => ({
      value: pkg.id,
      label: `${pkg.name} (${pkg.postcode})`
    })) || [],
    [carePackages]
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <FormSection
        title="Shift Information"
        subtitle="Configure the basic details for your shift"
      >
        <Grid container spacing={FORM_CONSTANTS.DEFAULT_SPACING}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Creating a <strong>{shiftType === 'COMPETENT' ? 'Competent' : 'Non-Competent'}</strong> shift.
              This will {formData.isCompetentOnly ? 'only show carers with required competencies' : 'show all available carers with competency information'}.
            </Alert>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormSelectField
              name="packageId"
              label="Care Package"
              value={formData.packageId}
              onChange={(value) => onChange({ packageId: value as string })}
              options={packageOptions}
              error={errors.packageId}
              required
              disabled={packagesLoading}
              placeholder="Select a care package"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <DatePicker
              label="Shift Date"
              value={formData.date}
              onChange={(date) => onChange({ date })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !!errors.date,
                  helperText: errors.date
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TimePicker
              label="Start Time"
              value={formData.startTime}
              onChange={(time) => onChange({ startTime: time })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !!errors.startTime,
                  helperText: errors.startTime
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TimePicker
              label="End Time"
              value={formData.endTime}
              onChange={(time) => onChange({ endTime: time })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !!errors.endTime,
                  helperText: errors.endTime
                }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <DatePicker
              label="Application Deadline (Optional)"
              value={formData.expiresAt}
              onChange={(date) => onChange({ expiresAt: date })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: "Leave empty for 48-hour default deadline"
                }
              }}
            />
          </Grid>
        </Grid>
      </FormSection>
    </LocalizationProvider>
  );
};