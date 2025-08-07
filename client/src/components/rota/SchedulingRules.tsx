import React, { useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Button
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface RuleViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  carerId?: string;
  carerName?: string;
  additionalInfo?: Record<string, any>;
}

interface WeeklySchedule {
  carerId: string;
  carerName: string;
  entries: any[];
  totalHours: number;
  dayShifts: number;
  nightShifts: number;
  violations: RuleViolation[];
}

interface SchedulingRulesProps {
  weeklySchedules: WeeklySchedule[];
  recentViolations?: RuleViolation[];
  onClearViolations?: () => void;
}

interface RuleExplanation {
  rule: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ruleExplanations: RuleExplanation[] = [
  {
    rule: 'MIN_COMPETENT_STAFF',
    title: 'Minimum Competent Staff',
    description: 'At least 1 competent staff member must be on duty at all times during each shift',
    icon: <CheckCircleIcon />
  },
  {
    rule: 'COMPETENCY_PAIRING',
    title: 'Competency Pairing',
    description: 'Non-competent carers must work alongside at least one competent carer',
    icon: <PersonIcon />
  },
  {
    rule: 'WEEKLY_HOUR_LIMIT',
    title: 'Weekly Hour Limits',
    description: 'Maximum 36 hours per carer per week to ensure adequate rest',
    icon: <ScheduleIcon />
  },
  {
    rule: 'ROTATION_PATTERN',
    title: 'Rotation Pattern',
    description: 'Recommended: 1 week day shifts → 1 week night shifts for work-life balance',
    icon: <InfoIcon />
  },
  {
    rule: 'CONSECUTIVE_WEEKENDS',
    title: 'Weekend Restrictions',
    description: 'No consecutive weekends for the same carer to ensure fair distribution',
    icon: <WarningIcon />
  },
  {
    rule: 'REST_PERIOD_VIOLATION',
    title: 'Rest Periods',
    description: '48-hour rest period required between night shifts and day shifts',
    icon: <ScheduleIcon />
  }
];

export const SchedulingRules: React.FC<SchedulingRulesProps> = ({ weeklySchedules, recentViolations = [], onClearViolations }) => {
  const [expanded, setExpanded] = useState<string | false>('violations');

  // Ensure weeklySchedules is an array and has the expected structure
  const safeWeeklySchedules = Array.isArray(weeklySchedules) ? weeklySchedules : [];

  // Collect all violations from weekly schedules
  const weeklyViolations = safeWeeklySchedules.flatMap(schedule => {
    // Ensure schedule has violations array
    const violations = Array.isArray(schedule?.violations) ? schedule.violations : [];
    return violations.map(violation => ({
      ...violation,
      carerName: schedule?.carerName || 'Unknown Carer'
    }));
  });

  // Combine and deduplicate violations properly
  const combinedViolations = [...weeklyViolations, ...recentViolations];
  
  // Deduplicate using uniqueKey or a combination of rule + carer + message
  const deduplicatedViolations = combinedViolations.filter((violation, index, array) => {
    const uniqueKey = violation.uniqueKey || `${violation.rule}-${violation.carerId || violation.carerName}-${violation.message}`;
    return index === array.findIndex(v => {
      const vKey = v.uniqueKey || `${v.rule}-${v.carerId || v.carerName}-${v.message}`;
      return vKey === uniqueKey;
    });
  });

  const allViolations = deduplicatedViolations;
  const errorViolations = allViolations.filter(v => v.severity === 'error');
  const warningViolations = allViolations.filter(v => v.severity === 'warning');

  // Group violations by rule
  const violationsByRule = allViolations.reduce((acc, violation) => {
    const rule = violation.rule;
    if (!acc[rule]) acc[rule] = [];
    acc[rule].push(violation);
    return acc;
  }, {} as Record<string, RuleViolation[]>);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const getRuleIcon = (rule: string) => {
    const explanation = ruleExplanations.find(r => r.rule === rule);
    return explanation?.icon || <InfoIcon />;
  };

  const getRuleTitle = (rule: string) => {
    const explanation = ruleExplanations.find(r => r.rule === rule);
    return explanation?.title || rule.replace('_', ' ');
  };

  const formatAdditionalInfo = (info: Record<string, any>) => {
    const formatters: Record<string, (value: any) => string> = {
      currentHours: (value) => `${value}h`,
      proposedHours: (value) => `${value}h`,
      totalHours: (value) => `${value}h`,
      limit: (value) => `${value}h`,
      hoursSince: (value) => `${value}h`,
      requiredHours: (value) => `${value}h`,
      weekStart: (value) => new Date(value).toLocaleDateString(),
      lastNightShift: (value) => new Date(value).toLocaleDateString(),
      proposedDayShift: (value) => new Date(value).toLocaleDateString(),
      shiftDate: (value) => new Date(value).toLocaleDateString(),
      currentWeekend: (value) => new Date(value).toLocaleDateString()
    };

    return Object.entries(info)
      .filter(([key, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const formatter = formatters[key];
        const formattedValue = formatter ? formatter(value) : String(value);
        const readableKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        return `${readableKey}: ${formattedValue}`;
      })
      .join(', ');
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {/* Summary */}
      <Card variant="outlined">
        <CardContent sx={{ py: 2 }}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="body2" fontWeight="medium">
              Schedule Status:
            </Typography>
            
            {errorViolations.length === 0 && warningViolations.length === 0 ? (
              <Chip
                icon={<CheckCircleIcon />}
                label="All Rules Passed"
                color="success"
                size="small"
              />
            ) : (
              <Box display="flex" gap={1}>
                {errorViolations.length > 0 && (
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${errorViolations.length} Error${errorViolations.length === 1 ? '' : 's'}`}
                    color="error"
                    size="small"
                  />
                )}
                {warningViolations.length > 0 && (
                  <Chip
                    icon={<WarningIcon />}
                    label={`${warningViolations.length} Warning${warningViolations.length === 1 ? '' : 's'}`}
                    color="warning"
                    size="small"
                  />
                )}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Violations */}
      {allViolations.length > 0 && (
        <Accordion 
          expanded={expanded === 'violations'} 
          onChange={handleAccordionChange('violations')}
          sx={{ 
            border: errorViolations.length > 0 ? '1px solid' : 'none',
            borderColor: 'error.main'
          }}
        >
          <AccordionSummary 
            expandIcon={
              <Badge badgeContent={allViolations.length} color="error">
                <ExpandMoreIcon />
              </Badge>
            }
            sx={{ 
              backgroundColor: errorViolations.length > 0 ? 'error.light' : 'warning.light',
              color: errorViolations.length > 0 ? 'error.contrastText' : 'warning.contrastText'
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box display="flex" alignItems="center" gap={1}>
                {errorViolations.length > 0 ? <ErrorIcon /> : <WarningIcon />}
                <Typography variant="body2" fontWeight="medium">
                  Scheduling Rule Issues ({allViolations.length})
                </Typography>
              </Box>
              
              {onClearViolations && allViolations.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent accordion toggle
                    onClearViolations();
                  }}
                  sx={{
                    mr: 2,
                    minWidth: 'auto',
                    px: 1,
                    py: 0.5,
                    fontSize: '11px',
                    color: 'inherit',
                    borderColor: 'currentColor',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Clear All
                </Button>
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexDirection="column" gap={2}>
              {Object.entries(violationsByRule).map(([rule, violations]) => (
                <Box key={rule}>
                  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                    {getRuleIcon(rule)}
                    <Typography variant="body2" fontWeight="medium" color="text.secondary">
                      {getRuleTitle(rule)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" flexDirection="column" gap={1}>
                    {violations.map((violation, index) => (
                      <Card 
                        key={index}
                        variant="outlined"
                        sx={{
                          border: '1px solid',
                          borderColor: violation.severity === 'error' ? 'error.main' : 'warning.main',
                          backgroundColor: violation.severity === 'error' ? 'error.light' : 'warning.light',
                          '&:hover': {
                            boxShadow: 2
                          }
                        }}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box display="flex" alignItems="start" gap={1.5}>
                            <Box sx={{ mt: 0.25 }}>
                              {violation.severity === 'error' ? (
                                <ErrorIcon 
                                  color="error" 
                                  fontSize="small"
                                  sx={{ filter: 'brightness(0.8)' }}
                                />
                              ) : (
                                <WarningIcon 
                                  color="warning" 
                                  fontSize="small"
                                  sx={{ filter: 'brightness(0.8)' }}
                                />
                              )}
                            </Box>
                            
                            <Box flex={1}>
                              <Typography 
                                variant="body2" 
                                fontWeight="medium"
                                sx={{
                                  color: violation.severity === 'error' ? 'error.dark' : 'warning.dark'
                                }}
                              >
                                {violation.carerName && (
                                  <Box component="span" sx={{ fontWeight: 'bold' }}>
                                    {violation.carerName}: 
                                  </Box>
                                )}
                                {violation.message}
                              </Typography>
                              
                              {violation.additionalInfo && (
                                <Typography 
                                  variant="caption" 
                                  sx={{
                                    display: 'block',
                                    mt: 0.5,
                                    color: violation.severity === 'error' ? 'error.dark' : 'warning.dark',
                                    opacity: 0.8
                                  }}
                                >
                                  {formatAdditionalInfo(violation.additionalInfo)}
                                </Typography>
                              )}
                            </Box>
                            
                            <Chip
                              size="small"
                              label={violation.severity.toUpperCase()}
                              color={violation.severity === 'error' ? 'error' : 'warning'}
                              sx={{ 
                                height: '20px', 
                                fontSize: '10px',
                                fontWeight: 'bold',
                                '& .MuiChip-label': {
                                  px: 0.75
                                }
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Rule Explanations */}
      <Accordion 
        expanded={expanded === 'rules'} 
        onChange={handleAccordionChange('rules')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <InfoIcon />
            <Typography variant="body2" fontWeight="medium">
              Scheduling Rules Reference
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {ruleExplanations.map((explanation) => (
              <ListItem key={explanation.rule}>
                <ListItemIcon>
                  {explanation.icon}
                </ListItemIcon>
                <ListItemText
                  primary={explanation.title}
                  secondary={explanation.description}
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};