import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { API_ENDPOINTS, ShiftType, ScheduleValidationResult, BatchDeleteResult } from '@caretrack/shared';
import { useNotification } from '../../contexts/NotificationContext';

interface CreateRotaEntryData extends Record<string, unknown> {
  packageId: string;
  carerId: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
}

export const useRotaMutations = (selectedPackageId: string, currentWeekStart: Date) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  // Mutation for quick validation during drag operations
  const validateRotaEntryMutation = useMutation({
    mutationFn: async (data: CreateRotaEntryData): Promise<ScheduleValidationResult> => {
      try {
        return await apiService.post<ScheduleValidationResult>(API_ENDPOINTS.ROTA.VALIDATE, data);
      } catch (error) {
        // Don't let validation errors block the drag UX
        console.warn('Validation error during drag:', error);
        return {
          isValid: false,
          violations: [],
          warnings: []
        };
      }
    }
  });

  // Mutation for creating rota entries via drag and drop
  const createRotaEntryMutation = useMutation({
    mutationFn: async (data: CreateRotaEntryData): Promise<{ response: any; shiftData: CreateRotaEntryData }> => {
      // Use postWithFullResponse to get violations/warnings along with data
      const response = await apiService.postWithFullResponse(API_ENDPOINTS.ROTA.CREATE, data);
      
      // Return both response and original data for use in onSuccess
      return { response, shiftData: data };
    },
    onSuccess: (result: { response: any; shiftData: CreateRotaEntryData }) => {
      const { response } = result;
      
      // Process violations with proper deduplication
      const violations = response?.violations || [];
      const warnings = response?.warnings || [];
      
      if (violations.length > 0 || warnings.length > 0) {
        // Show simple success message
        showSuccess(`Shift assigned with ${violations.length > 0 ? 'errors' : 'warnings'}`);
      } else {
        showSuccess('Shift assigned successfully');
      }
      
      // Invalidate and refetch the weekly schedule
      queryClient.invalidateQueries({ 
        queryKey: ['weekly-schedule', selectedPackageId, currentWeekStart.toISOString()],
        exact: true 
      });
    },
    onError: (error: unknown) => {
      // Show specific scheduling violations if available
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { violations?: any[]; error?: string } }; message?: string };
        const responseData = axiosError.response?.data;
        if (responseData?.violations) {
          const violationMessages = responseData.violations
            .filter(v => v.severity === 'error')
            .map(v => v.message)
            .join('\n');
          
          showError(`Critical errors:\n${violationMessages}`);
        } else {
          const errorMessage = responseData?.error || axiosError.message || 'Failed to assign shift';
          showError(errorMessage);
        }
      } else {
        showError('Failed to assign shift');
      }
    }
  });

  // Mutation for clearing all schedule entries
  const clearAllEntriesMutation = useMutation({
    mutationFn: async (entries: any[]): Promise<number> => {
      if (!entries || entries.length === 0) {
        throw new Error('No entries to clear');
      }
      
      console.log('🗑️ Clearing entries:', entries.map(e => ({ 
        id: e.id, 
        carer: e.carer.name, 
        date: new Date(e.date).toDateString(), 
        shiftType: e.shiftType 
      })));
      
      // Batch delete all entries for this week
      const idsToDelete = entries.map(entry => entry.id);
      
      const result = await apiService.delete<BatchDeleteResult>(API_ENDPOINTS.ROTA.BATCH_DELETE, { 
        ids: idsToDelete 
      });
      
      const successCount = result.deletedCount;
      const errors = result.errors || [];
      
      if (errors.length > 0) {
        if (successCount === 0) {
          throw new Error(`Failed to delete entries: ${errors.map(e => e.error).join(', ')}`);
        }
      }
      
      return successCount;
    },
    onSuccess: (deletedCount) => {
      if (deletedCount > 0) {
        showSuccess(`Cleared ${deletedCount} scheduled entries successfully`);
        
        // Refresh the schedule  
        queryClient.invalidateQueries({ 
          queryKey: ['weekly-schedule', selectedPackageId, currentWeekStart.toISOString()],
          exact: true 
        });
      }
    },
    onError: (error: Error) => {
      showError(error?.message || 'Failed to clear schedule entries');
    }
  });

  return {
    validateRotaEntryMutation,
    createRotaEntryMutation,
    clearAllEntriesMutation
  };
};