import { useState, useCallback } from 'react';
import { DropResult, DragUpdate } from 'react-beautiful-dnd';
import { ShiftType, DragValidationResult } from '@caretrack/shared';
import { useQueryClient } from '@tanstack/react-query';

interface EnhancedDragOptions {
  enableHapticFeedback?: boolean;
  enableVisualFeedback?: boolean;
  enableSmartSuggestions?: boolean;
  mobileOptimized?: boolean;
}

export const useRotaDragAndDrop = (
  selectedPackageId: string,
  createRotaEntryMutation: any,
  options: EnhancedDragOptions = {
    enableHapticFeedback: true,
    enableVisualFeedback: true,
    enableSmartSuggestions: true,
    mobileOptimized: true
  }
) => {
  const [dragValidationResult, setDragValidationResult] = useState<DragValidationResult | undefined>(undefined);
  const [isDragInProgress, setIsDragInProgress] = useState(false);
  const queryClient = useQueryClient();

  // Handle drag start with improved feedback
  const handleOnDragStart = useCallback(() => {
    setIsDragInProgress(true);
    setDragValidationResult(undefined);
    // Add haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  // Handle drag update for real-time validation feedback with enhanced UX
  const handleOnDragUpdate = useCallback((update: DragUpdate) => {
    // Enhanced drag update with better validation and mobile optimization
    if (!update?.destination) {
      setDragValidationResult(undefined);
      return;
    }

    const destinationId = update.destination.droppableId;
    const parts = destinationId.split('-');
    
    if (parts.length >= 6 && parts[0] === 'shift' && parts[1] === 'slot') {
      const dateStr = `${parts[2]}-${parts[3]}-${parts[4]}`;
      const shiftType = parts[5] as ShiftType;
      const carerId = update.draggableId.replace('carer-', '');
      
      // Smart validation with scheduling rules preview
      const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
      const isNightShift = shiftType === ShiftType.NIGHT;
      
      // Enhanced validation state for better visual feedback
      setDragValidationResult({
        success: true,
        destinationId,
        carerId,
        shiftType,
        date: dateStr,
        data: { 
          isValid: true, 
          warnings: isWeekend ? ['Weekend shift'] : [], 
          violations: [],
          // Add visual feedback data
          isHovering: true,
          canDrop: true,
          isWeekend,
          isNightShift,
          suggestedTimes: {
            [ShiftType.DAY]: { start: '09:00', end: '17:00' },
            [ShiftType.NIGHT]: { start: '21:00', end: '07:00' }
          }[shiftType]
        }
      } as DragValidationResult);
    }
  }, []);

  // Handle drag end with optimistic updates
  const handleOnDragEnd = useCallback((result: DropResult) => {
    setIsDragInProgress(false);
    setDragValidationResult(undefined);

    if (!result.destination) {
      // Add haptic feedback for cancelled drag
      if (navigator.vibrate) {
        navigator.vibrate([30, 30, 30]);
      }
      return;
    }

    // Parse the droppable ID to get date and shift type
    // Format: "shift-slot-YYYY-MM-DD-DAY" or "shift-slot-YYYY-MM-DD-NIGHT"
    const destinationId = result.destination.droppableId;
    const parts = destinationId.split('-');
    
    if (parts.length >= 6 && parts[0] === 'shift' && parts[1] === 'slot') {
      const dateStr = `${parts[2]}-${parts[3]}-${parts[4]}`;
      const shiftType = parts[5] as ShiftType;
      const date = new Date(dateStr);
      
      // Extract carer ID from draggable ID
      const carerId = result.draggableId.replace('carer-', '');
      
      // Default shift times based on shift type
      const defaultTimes = {
        [ShiftType.DAY]: { startTime: '09:00', endTime: '17:00' },
        [ShiftType.NIGHT]: { startTime: '21:00', endTime: '07:00' }
      };

      const shiftData = {
        packageId: selectedPackageId,
        carerId,
        date: date.toISOString(),
        shiftType,
        startTime: defaultTimes[shiftType].startTime,
        endTime: defaultTimes[shiftType].endTime
      };

      // Optimistic update - immediately update UI before server response
      const queryKey = ['rota-weekly', selectedPackageId];
      const previousData = queryClient.getQueryData(queryKey);
      
      // Optimistically add the new entry to the cache
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        
        const newEntry = {
          id: `temp-${Date.now()}`, // Temporary ID
          ...shiftData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return {
          ...oldData,
          entries: [...(oldData.entries || []), newEntry]
        };
      });

      // Enhanced haptic feedback for successful drop
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 100]); // Success pattern
      }
      
      // Visual feedback for successful drop
      const dropFeedback = document.createElement('div');
      dropFeedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #4caf50;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 10000;
        animation: slideInOut 2s ease-in-out forwards;
      `;
      dropFeedback.textContent = '✓ Shift Scheduled';
      
      // Add animation keyframes
      if (!document.querySelector('#drop-feedback-styles')) {
        const style = document.createElement('style');
        style.id = 'drop-feedback-styles';
        style.textContent = `
          @keyframes slideInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(dropFeedback);
      setTimeout(() => {
        if (document.body.contains(dropFeedback)) {
          document.body.removeChild(dropFeedback);
        }
      }, 2000);

      // Execute the mutation with onError rollback
      createRotaEntryMutation.mutate(shiftData, {
        onError: (error: any) => {
          // Rollback optimistic update on error
          queryClient.setQueryData(queryKey, previousData);
          
          // Enhanced error feedback
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 100]); // Error pattern
          }
          
          // Visual error feedback
          const errorFeedback = document.createElement('div');
          errorFeedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            animation: shakeAndFade 3s ease-in-out forwards;
            max-width: 300px;
            text-align: center;
          `;
          const errorMessage = error?.response?.data?.error || 'Scheduling conflict detected';
          errorFeedback.textContent = `✗ ${errorMessage}`;
          
          // Add shake animation
          if (!document.querySelector('#error-feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'error-feedback-styles';
            style.textContent = `
              @keyframes shakeAndFade {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                10% { opacity: 1; transform: translate(-50%, -50%) scale(1.05) translateX(-10px); }
                20% { transform: translate(-50%, -50%) scale(1) translateX(10px); }
                30% { transform: translate(-50%, -50%) scale(1) translateX(-5px); }
                40% { transform: translate(-50%, -50%) scale(1) translateX(5px); }
                50% { transform: translate(-50%, -50%) scale(1) translateX(0); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
              }
            `;
            document.head.appendChild(style);
          }
          
          document.body.appendChild(errorFeedback);
          setTimeout(() => {
            if (document.body.contains(errorFeedback)) {
              document.body.removeChild(errorFeedback);
            }
          }, 3000);
        },
        onSuccess: () => {
          // Refetch to get the real data with server-generated ID
          queryClient.invalidateQueries({ queryKey });
        }
      });
    }
  }, [selectedPackageId, createRotaEntryMutation, queryClient]);

  // Smart scheduling suggestions
  const getSchedulingSuggestions = useCallback((carerId: string, date: Date, shiftType: ShiftType) => {
    const suggestions = [];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isWeekend) {
      suggestions.push({
        type: 'weekend',
        message: 'Weekend shift - check availability preferences',
        severity: 'info' as const
      });
    }
    
    if (shiftType === ShiftType.NIGHT) {
      suggestions.push({
        type: 'night_shift',
        message: 'Night shift - ensure adequate rest periods',
        severity: 'warning' as const
      });
    }
    
    return suggestions;
  }, []);

  return {
    dragValidationResult,
    isDragInProgress,
    handleOnDragStart,
    handleOnDragUpdate,
    handleOnDragEnd,
    getSchedulingSuggestions
  };
};