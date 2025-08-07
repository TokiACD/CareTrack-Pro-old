import { useState, useEffect, useRef } from 'react';
import { RuleViolation, RotaPageData } from '@caretrack/shared';

export const useRotaViolations = (weeklyData?: RotaPageData) => {
  const [recentViolations, setRecentViolations] = useState<RuleViolation[]>([]);
  const [showAllViolations, setShowAllViolations] = useState(false);
  
  // Ref to store timeout IDs for cleanup
  const violationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup effect to clear timeouts on component unmount
  useEffect(() => {
    return () => {
      if (violationTimeoutRef.current) {
        clearTimeout(violationTimeoutRef.current);
        violationTimeoutRef.current = null;
      }
    };
  }, []);

  // Clear timeout when violations are manually cleared or component state changes
  useEffect(() => {
    if (recentViolations.length === 0 && violationTimeoutRef.current) {
      clearTimeout(violationTimeoutRef.current);
      violationTimeoutRef.current = null;
    }
  }, [recentViolations.length]);

  const handleDismissViolation = (index: number) => {
    if (showAllViolations) {
      // When showing all violations, only dismiss non-persistent ones
      const allViolations = [
        ...recentViolations,
        ...(Array.isArray(weeklyData?.weeklySchedules) 
          ? weeklyData.weeklySchedules.flatMap(schedule => 
              (schedule?.violations || []).map(v => ({
                ...v,
                carerName: (schedule as any)?.carerName || 'Unknown Carer',
                uniqueKey: `${v.rule}-${(schedule as any)?.carerId}-${v.message}`,
                isPersistent: true
              }))
            )
          : []
        )
      ];
      
      const violationToRemove = allViolations[index];
      if (violationToRemove && !violationToRemove.isPersistent) {
        // Only remove from recent violations if it's not persistent
        const recentIndex = recentViolations.findIndex(v => v.uniqueKey === violationToRemove.uniqueKey);
        if (recentIndex >= 0) {
          setRecentViolations(prev => prev.filter((_, i) => i !== recentIndex));
        }
      }
    } else {
      // Normal behavior - dismiss from recent violations
      setRecentViolations(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addViolations = (violations: RuleViolation[], warnings: RuleViolation[], shiftData: any) => {
    if (violations.length > 0 || warnings.length > 0) {
      // Create unique violations with date info and aggressive deduplication
      const newViolations: RuleViolation[] = [...violations, ...warnings].map((v, index) => ({
        ...v,
        uniqueKey: `${v.rule}-${shiftData.carerId}-${shiftData.date}-${shiftData.shiftType}-${v.message.substring(0, 50)}`, // Super unique key
        timestamp: Date.now() + index // Ensure ordering
      }));
      
      // Completely replace violations to prevent any accumulation
      setRecentViolations(newViolations);
      
      // Auto-clear violations after 10 seconds to prevent stress buildup
      // Clear any existing timeout to prevent memory leaks
      if (violationTimeoutRef.current) {
        clearTimeout(violationTimeoutRef.current);
      }
      
      violationTimeoutRef.current = setTimeout(() => {
        setRecentViolations(prev => prev.filter(v => 
          !newViolations.some(nv => nv.uniqueKey === v.uniqueKey)
        ));
        violationTimeoutRef.current = null;
      }, 10000);
    } else {
      // Clear violations on success
      setRecentViolations([]);
    }
  };

  const clearRecentViolations = () => {
    setRecentViolations([]);
  };

  const clearAllViolationsOnNavigation = () => {
    setRecentViolations([]);
  };

  const getDisplayedViolations = () => {
    return showAllViolations 
      ? [
          ...recentViolations,
          ...(Array.isArray(weeklyData?.weeklySchedules) 
            ? weeklyData.weeklySchedules.flatMap(schedule => 
                (schedule?.violations || []).map(v => ({
                  ...v,
                  carerName: (schedule as any)?.carerName || 'Unknown Carer',
                  uniqueKey: `${v.rule}-${(schedule as any)?.carerId}-${v.message}`,
                  isPersistent: true // Mark as non-dismissible
                }))
              )
            : []
          )
        ]
      : recentViolations;
  };

  const getTotalViolationCount = () => {
    return Array.isArray(weeklyData?.weeklySchedules) 
      ? weeklyData.weeklySchedules.reduce((total, schedule) => 
          total + (schedule?.violations?.length || 0), 0
        ) + recentViolations.length
      : recentViolations.length;
  };

  return {
    recentViolations,
    showAllViolations,
    setShowAllViolations,
    handleDismissViolation,
    addViolations,
    clearRecentViolations,
    clearAllViolationsOnNavigation,
    getDisplayedViolations,
    getTotalViolationCount
  };
};