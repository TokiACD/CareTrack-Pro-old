import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Tab,
  Tabs,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Paper,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PhoneAndroid as PhoneIcon,
  TabletMac as TabletIcon,
  DesktopMac as DesktopIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  PlayArrow as PlayIcon,
  Accessibility as AccessibilityIcon,
  Speed as SpeedIcon,
  TouchApp as TouchIcon,
  Visibility as EyeIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

import { runMobileAudit, simulateDevice, deviceProfiles } from '../../utils/mobileTestingUtils';
import { runAccessibilityAudit } from '../../utils/accessibilityUtils';
import { getBrowserInfo, checkBrowserFeatures } from '../../utils/crossBrowserCompat';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div role="tabpanel" hidden={value !== index} {...other}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const MobileTestingDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [mobileAuditResult, setMobileAuditResult] = useState<any>(null);
  const [accessibilityResult, setAccessibilityResult] = useState<any>(null);
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deviceSimulatorOpen, setDeviceSimulatorOpen] = useState(false);

  useEffect(() => {
    setBrowserInfo({
      ...getBrowserInfo(),
      features: checkBrowserFeatures(),
    });
  }, []);

  const runTests = async () => {
    setLoading(true);
    try {
      const [mobileResult, a11yResult] = await Promise.all([
        runMobileAudit(),
        runAccessibilityAudit(),
      ]);
      
      setMobileAuditResult(mobileResult);
      setAccessibilityResult(a11yResult);
    } catch (error) {
      console.error('Testing failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'A':
      case 'AA':
        return <CheckIcon color="success" />;
      case 'B':
        return <WarningIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  return (
    <Box sx={{ width: '100%', p: isMobile ? 2 : 3 }}>
      <Paper elevation={0} sx={{ mb: 3, p: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
          CareTrack Pro - Mobile & Accessibility Testing
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Comprehensive testing dashboard for mobile responsiveness and accessibility compliance
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <PhoneIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Mobile Ready</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Responsive Design
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <AccessibilityIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Accessible</Typography>
                  <Typography variant="body2" color="text.secondary">
                    WCAG 2.1 Compliant
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <SpeedIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Fast</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Optimized Performance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <TouchIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h6">Touch Friendly</Typography>
                  <Typography variant="body2" color="text.secondary">
                    44px+ Targets
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Test Controls */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <PlayIcon />}
                  onClick={runTests}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                >
                  Run Comprehensive Tests
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setDeviceSimulatorOpen(true)}
                  size={isMobile ? "small" : "medium"}
                >
                  Device Simulator
                </Button>
                {browserInfo && (
                  <Chip
                    icon={browserInfo.isChrome ? <CheckIcon /> : <WarningIcon />}
                    label={browserInfo.isChrome ? 'Chrome (Recommended)' : 'Browser Compatibility'}
                    color={browserInfo.isChrome ? 'success' : 'warning'}
                    variant="outlined"
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Results */}
        {(mobileAuditResult || accessibilityResult) && (
          <Grid item xs={12}>
            <Card>
              <Tabs 
                value={activeTab} 
                onChange={(_, v) => setActiveTab(v)}
                variant={isMobile ? "scrollable" : "fullWidth"}
                scrollButtons="auto"
              >
                <Tab label="Mobile Audit" icon={<PhoneIcon />} />
                <Tab label="Accessibility" icon={<AccessibilityIcon />} />
                <Tab label="Browser Support" icon={<DesktopIcon />} />
                <Tab label="Recommendations" icon={<EyeIcon />} />
              </Tabs>

              <TabPanel value={activeTab} index={0}>
                {mobileAuditResult && (
                  <Box>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                      <Box>
                        <Typography variant="h4" component="div" color={getScoreColor(mobileAuditResult.overallScore)}>
                          {mobileAuditResult.overallScore}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Mobile Score
                        </Typography>
                      </Box>
                      <Box sx={{ flexGrow: 1, ml: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={mobileAuditResult.overallScore}
                          color={getScoreColor(mobileAuditResult.overallScore) as any}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Chip
                        icon={getGradeIcon(mobileAuditResult.grade)}
                        label={`Grade ${mobileAuditResult.grade}`}
                        color={getScoreColor(mobileAuditResult.overallScore) as any}
                      />
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>Touch Targets ({mobileAuditResult.touchTargets?.score || 0}%)</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" gutterBottom>
                              {mobileAuditResult.touchTargets?.accessibleElements || 0} of {mobileAuditResult.touchTargets?.totalElements || 0} elements meet accessibility standards
                            </Typography>
                            {mobileAuditResult.touchTargets?.results?.filter((r: any) => r.suggestions.length > 0).slice(0, 3).map((result: any, index: number) => (
                              <Alert key={index} severity="info" sx={{ mt: 1, fontSize: '0.875rem' }}>
                                {result.suggestions[0]}
                              </Alert>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>Text Readability ({mobileAuditResult.textReadability?.score || 0}%)</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" gutterBottom>
                              {mobileAuditResult.textReadability?.readableElements || 0} of {mobileAuditResult.textReadability?.totalElements || 0} text elements are optimized for mobile
                            </Typography>
                            <Alert severity="info" sx={{ mt: 1, fontSize: '0.875rem' }}>
                              Use minimum 16px font size on mobile devices
                            </Alert>
                          </AccordionDetails>
                        </Accordion>
                      </Grid>

                      <Grid item xs={12}>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>
                              Horizontal Scroll 
                              {mobileAuditResult.horizontalScroll?.hasHorizontalScroll ? ' ❌' : ' ✅'}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {mobileAuditResult.horizontalScroll?.hasHorizontalScroll ? (
                              <Alert severity="warning">
                                Horizontal scrolling detected. Check responsive design implementation.
                              </Alert>
                            ) : (
                              <Alert severity="success">
                                No horizontal scrolling detected - excellent responsive design!
                              </Alert>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                {accessibilityResult && (
                  <Box>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                      <Box>
                        <Typography variant="h4" component="div" color={getScoreColor(accessibilityResult.overallScore)}>
                          {accessibilityResult.overallScore}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          A11y Score
                        </Typography>
                      </Box>
                      <Box sx={{ flexGrow: 1, ml: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={accessibilityResult.overallScore}
                          color={getScoreColor(accessibilityResult.overallScore) as any}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                      <Chip
                        label={accessibilityResult.wcagLevel}
                        color={getScoreColor(accessibilityResult.overallScore) as any}
                      />
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Keyboard Navigation</Typography>
                            <Typography variant="h4" color={getScoreColor(accessibilityResult.results.keyboardNavigation.score)}>
                              {accessibilityResult.results.keyboardNavigation.score}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {accessibilityResult.results.keyboardNavigation.accessibleElements} of {accessibilityResult.results.keyboardNavigation.totalElements} elements accessible
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Screen Reader Support</Typography>
                            <Typography variant="h4" color={getScoreColor(accessibilityResult.results.screenReaderSupport.score)}>
                              {accessibilityResult.results.screenReaderSupport.score}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Proper labeling and structure
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {accessibilityResult.criticalIssues.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Critical Issues:</Typography>
                        <List dense>
                          {accessibilityResult.criticalIssues.slice(0, 5).map((issue: string, index: number) => (
                            <ListItem key={index} sx={{ py: 0 }}>
                              <ListItemText primary={issue} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                            </ListItem>
                          ))}
                        </List>
                      </Alert>
                    )}
                  </Box>
                )}
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                {browserInfo && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Browser Information</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>Current Browser</Typography>
                            <Chip 
                              label={browserInfo.isChrome ? 'Chrome' : browserInfo.isFirefox ? 'Firefox' : browserInfo.isSafari ? 'Safari' : browserInfo.isEdge ? 'Edge' : 'Unknown'}
                              color={browserInfo.isChrome ? 'success' : 'default'}
                            />
                            <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                              Mobile: {browserInfo.isMobile ? 'Yes' : 'No'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Touch Support: {browserInfo.features?.touchEvents ? 'Yes' : 'No'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>Feature Support</Typography>
                            <Stack spacing={1}>
                              {Object.entries(browserInfo.features || {}).map(([feature, supported]) => (
                                <Stack key={feature} direction="row" alignItems="center" spacing={1}>
                                  {supported ? <CheckIcon color="success" fontSize="small" /> : <ErrorIcon color="error" fontSize="small" />}
                                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                <Typography variant="h6" gutterBottom>Recommendations for Healthcare Professionals</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom color="primary">Mobile Optimization</Typography>
                        <List dense>
                          <ListItem>
                            <ListItemIcon><TouchIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Ensure all buttons are at least 44x44 pixels" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><EyeIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Use minimum 16px font size for readability" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><PhoneIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Test on actual mobile devices" />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom color="secondary">Accessibility</Typography>
                        <List dense>
                          <ListItem>
                            <ListItemIcon><AccessibilityIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Test with screen readers" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Ensure keyboard navigation works" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><WarningIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Check color contrast ratios" />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Device Simulator Dialog */}
      <Dialog
        open={deviceSimulatorOpen}
        onClose={() => setDeviceSimulatorOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Device Simulator</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Click on a device profile to simulate the viewport size:
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {Object.entries(deviceProfiles).map(([key, device]) => (
              <Grid item xs={6} sm={4} key={key}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    simulateDevice(key as keyof typeof deviceProfiles);
                    setDeviceSimulatorOpen(false);
                  }}
                  startIcon={device.width < 600 ? <PhoneIcon /> : device.width < 1000 ? <TabletIcon /> : <DesktopIcon />}
                  sx={{ textAlign: 'left', justifyContent: 'flex-start' }}
                >
                  <Box>
                    <Typography variant="body2" component="div">{device.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {device.width}x{device.height}
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeviceSimulatorOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileTestingDashboard;