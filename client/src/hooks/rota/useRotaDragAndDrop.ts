import { useState } from 'react';
import { DropResult } from 'react-beautiful-dnd';
import { ShiftType, DragValidationResult } from '@caretrack/shared';

export const useRotaDragAndDrop = (
  selectedPackageId: string,
  createRotaEntryMutation: any
) => {
  const [dragValidationResult, setDragValidationResult] = useState<DragValidationResult | undefined>(undefined);
  const [isDragInProgress, setIsDragInProgress] = useState(false);

  // Handle drag start
  const handleOnDragStart = () => {
    setIsDragInProgress(true);
    setDragValidationResult(undefined);
  };

  // Handle drag update for real-time validation feedback
  const handleOnDragUpdate = (update: { destination?: { droppableId: string }; draggableId: string } | null) => {
    // Simplified drag update - just track the destination for visual feedback
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
      
      // Set basic validation state for visual feedback only
      setDragValidationResult({
        success: true,
        destinationId,
        carerId,
        shiftType,
        date: dateStr,
        data: { isValid: true, warnings: [], violations: [] }
      } as DragValidationResult);
    }
  };

  // Handle drag end
  const handleOnDragEnd = (result: DropResult) => {
    setIsDragInProgress(false);
    setDragValidationResult(undefined);

    if (!result.destination) {
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

      createRotaEntryMutation.mutate(shiftData);
    }
  };

  return {
    dragValidationResult,
    isDragInProgress,
    handleOnDragStart,
    handleOnDragUpdate,
    handleOnDragEnd
  };
};