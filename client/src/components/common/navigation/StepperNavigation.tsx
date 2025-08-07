import React from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Box,
  Typography,
  Paper,
  LinearProgress,
  Collapse,
  Fade
} from '@mui/material';
import { CheckCircle, Error, Warning } from '@mui/icons-material';
import { STEPPER_CONSTANTS, ANIMATION_CONSTANTS } from '../../../constants/ui';

export interface StepData {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
  completed?: boolean;
  error?: boolean;
  warning?: boolean;
  disabled?: boolean;
}

export interface StepAction {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  disabled?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export interface StepperNavigationProps {
  steps: StepData[];
  activeStep: number;
  onStepChange?: (stepIndex: number) => void;
  orientation?: 'horizontal' | 'vertical';
  nonLinear?: boolean;
  showProgress?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  renderStepContent?: (stepIndex: number, step: StepData) => React.ReactNode;
  stepActions?: StepAction[];
  alternativeLabel?: boolean;
  sx?: any;
}

const StepIcon: React.FC<{
  completed?: boolean;
  error?: boolean;
  warning?: boolean;
  icon: React.ReactNode;
}> = ({ completed, error, warning, icon }) => {
  if (completed) {
    return <CheckCircle color="success" />;
  }
  
  if (error) {
    return <Error color="error" />;
  }
  
  if (warning) {
    return <Warning color="warning" />;
  }
  
  return <>{icon}</>;
};

export const StepperNavigation: React.FC<StepperNavigationProps> = ({
  steps,
  activeStep,
  onStepChange,
  orientation = 'vertical',
  nonLinear = false,
  showProgress = true,
  loading = false,
  children,
  renderStepContent,
  stepActions = [],
  alternativeLabel = false,
  sx
}) => {
  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const handleStepClick = (stepIndex: number) => {
    const step = steps[stepIndex];
    if (step.disabled || loading) return;
    
    if (nonLinear || stepIndex <= activeStep) {
      onStepChange?.(stepIndex);
    }
  };

  const getStepProps = (stepIndex: number) => {
    const step = steps[stepIndex];
    return {
      completed: step.completed,
      disabled: step.disabled,
      error: step.error,
      optional: step.optional ? (
        <Typography variant="caption">Optional</Typography>
      ) : undefined
    };
  };

  const StepLabelComponent = ({ step, stepIndex }: { step: StepData; stepIndex: number }) => (
    <StepLabel
      {...getStepProps(stepIndex)}
      StepIconComponent={(props) => (
        <StepIcon
          {...props}
          completed={step.completed}
          error={step.error}
          warning={step.warning}
          icon={props.icon}
        />
      )}
      onClick={nonLinear ? () => handleStepClick(stepIndex) : undefined}
      sx={{
        cursor: nonLinear && !step.disabled ? 'pointer' : 'default',
        '&:hover': nonLinear && !step.disabled ? {
          backgroundColor: 'action.hover'
        } : {}
      }}
    >
      <Box>
        <Typography variant="h6" component="div">
          {step.label}
        </Typography>
        {step.description && (
          <Typography variant="body2" color="text.secondary">
            {step.description}
          </Typography>
        )}
      </Box>
    </StepLabel>
  );

  const ActionButtons = () => (
    stepActions.length > 0 && (
      <Box sx={{ mb: 2, mt: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {stepActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant || 'text'}
              color={action.color || 'primary'}
              disabled={action.disabled || loading}
              startIcon={action.startIcon}
              endIcon={action.endIcon}
              sx={{ 
                minWidth: 100,
                transition: `all ${ANIMATION_CONSTANTS.NORMAL_TRANSITION}ms`
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </Box>
    )
  );

  return (
    <Box sx={sx}>
      {/* Progress Bar */}
      {showProgress && (
        <Fade in={showProgress}>
          <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {completedSteps} of {steps.length} completed
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 6,
                borderRadius: 3,
                transition: `all ${ANIMATION_CONSTANTS.NORMAL_TRANSITION}ms`
              }}
            />
          </Box>
        </Fade>
      )}

      {/* Loading Overlay */}
      <Collapse in={loading}>
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Processing...
          </Typography>
        </Box>
      </Collapse>

      {/* Stepper */}
      <Stepper
        activeStep={activeStep}
        orientation={orientation}
        nonLinear={nonLinear}
        alternativeLabel={alternativeLabel}
        sx={{
          '& .MuiStepConnector-root': {
            transition: `all ${ANIMATION_CONSTANTS.NORMAL_TRANSITION}ms`
          }
        }}
      >
        {steps.map((step, index) => (
          <Step key={step.id} {...getStepProps(index)}>
            <StepLabelComponent step={step} stepIndex={index} />
            
            {orientation === 'vertical' && (
              <StepContent>
                <Box sx={{ pb: 2 }}>
                  {renderStepContent ? (
                    renderStepContent(index, step)
                  ) : (
                    children
                  )}
                  
                  <ActionButtons />
                </Box>
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>

      {/* Horizontal Content */}
      {orientation === 'horizontal' && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Fade 
            in={true} 
            key={activeStep}
            timeout={ANIMATION_CONSTANTS.NORMAL_TRANSITION}
          >
            <Box>
              {renderStepContent ? (
                renderStepContent(activeStep, steps[activeStep])
              ) : (
                children
              )}
              
              <ActionButtons />
            </Box>
          </Fade>
        </Paper>
      )}
    </Box>
  );
};

// Hook for managing stepper state
export function useStepper(initialStep = 0, maxSteps: number = STEPPER_CONSTANTS.MAX_STEPS) {
  const [activeStep, setActiveStep] = React.useState(initialStep);
  const [completed, setCompleted] = React.useState<Set<number>>(new Set());

  const handleNext = React.useCallback(() => {
    setActiveStep(prev => Math.min(prev + 1, maxSteps - 1));
  }, [maxSteps]);

  const handleBack = React.useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleStep = React.useCallback((step: number) => {
    if (step >= 0 && step < maxSteps) {
      setActiveStep(step);
    }
  }, [maxSteps]);

  const handleReset = React.useCallback(() => {
    setActiveStep(0);
    setCompleted(new Set());
  }, []);

  const markStepCompleted = React.useCallback((step: number) => {
    setCompleted(prev => new Set([...prev, step]));
  }, []);

  const markStepIncomplete = React.useCallback((step: number) => {
    setCompleted(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(step);
      return newSet;
    });
  }, []);

  const isStepCompleted = React.useCallback((step: number) => {
    return completed.has(step);
  }, [completed]);

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === maxSteps - 1;
  const completedStepsCount = completed.size;

  return {
    activeStep,
    completed: Array.from(completed),
    completedStepsCount,
    isFirstStep,
    isLastStep,
    handleNext,
    handleBack,
    handleStep,
    handleReset,
    markStepCompleted,
    markStepIncomplete,
    isStepCompleted
  };
}