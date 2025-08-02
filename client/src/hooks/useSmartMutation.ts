import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { getQueriesToInvalidate, MutationType } from './invalidationRules';

/**
 * Enhanced mutation hook that automatically invalidates related queries
 * based on predefined rules
 */

interface SmartMutationOptions<TData, TError, TVariables, TContext> 
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'onSuccess'> {
  mutationType: MutationType;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void | Promise<void>;
  customInvalidations?: string[]; // Additional queries to invalidate
  skipAutoInvalidation?: boolean; // Skip automatic invalidation if needed
}

export const useSmartMutation = <TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: SmartMutationOptions<TData, TError, TVariables, TContext>
) => {
  const queryClient = useQueryClient();
  const { 
    mutationType, 
    onSuccess, 
    customInvalidations = [], 
    skipAutoInvalidation = false,
    ...mutationOptions 
  } = options;

  return useMutation({
    mutationFn,
    ...mutationOptions,
    onSuccess: async (data: TData, variables: TVariables, context: TContext) => {
      // Execute user's onSuccess callback first
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }

      // Auto-invalidate queries based on mutation type
      if (!skipAutoInvalidation) {
        const queriesToInvalidate = getQueriesToInvalidate(mutationType);
        
        // Combine auto and custom invalidations
        const allQueries = [...queriesToInvalidate, ...customInvalidations];
        
        // Remove duplicates
        const uniqueQueries = Array.from(new Set(allQueries));
        
        // Invalidate all relevant queries
        const invalidationPromises = uniqueQueries.map(queryKey => 
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        );
        
        await Promise.all(invalidationPromises);
        
        // Log invalidations in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 [useSmartMutation] ${mutationType} invalidated:`, uniqueQueries);
        }
      }
    }
  });
};

/**
 * Utility hook for manual query invalidation
 * Useful for complex scenarios or manual cache management
 */
export const useQueryInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateByMutationType = async (mutationType: MutationType, customQueries: string[] = []) => {
    const queriesToInvalidate = getQueriesToInvalidate(mutationType);
    const allQueries = [...queriesToInvalidate, ...customQueries];
    const uniqueQueries = Array.from(new Set(allQueries));

    const invalidationPromises = uniqueQueries.map(queryKey => 
      queryClient.invalidateQueries({ queryKey: [queryKey] })
    );
    
    await Promise.all(invalidationPromises);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [Manual Invalidation] ${mutationType} invalidated:`, uniqueQueries);
    }
  };

  const invalidateQueries = async (queryKeys: string[]) => {
    const invalidationPromises = queryKeys.map(queryKey => 
      queryClient.invalidateQueries({ queryKey: [queryKey] })
    );
    
    await Promise.all(invalidationPromises);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [Manual Invalidation] Invalidated:`, queryKeys);
    }
  };

  return {
    invalidateByMutationType,
    invalidateQueries,
    queryClient
  };
};

export default useSmartMutation;