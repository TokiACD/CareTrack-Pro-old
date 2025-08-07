import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { getQueriesToInvalidate, MutationType } from './invalidationRules';

/**
 * Enhanced mutation hook that automatically invalidates related queries
 * based on predefined rules
 */

interface SmartMutationOptions<TData, TError, TVariables, TContext> 
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'onSuccess' | 'onMutate' | 'onError'> {
  mutationType: MutationType;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void | Promise<void>;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext | void;
  customInvalidations?: string[]; // Additional queries to invalidate
  skipAutoInvalidation?: boolean; // Skip automatic invalidation if needed
  enableOptimisticUpdates?: boolean; // Enable optimistic updates
  optimisticUpdater?: (variables: TVariables, oldData: any) => any; // Function to optimistically update cache
  rollbackOnError?: boolean; // Whether to rollback optimistic updates on error
  immediateInvalidation?: boolean; // Immediately invalidate related queries
}

export const useSmartMutation = <TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: SmartMutationOptions<TData, TError, TVariables, TContext>
) => {
  const queryClient = useQueryClient();
  const { 
    mutationType, 
    onSuccess, 
    onError,
    onMutate,
    customInvalidations = [], 
    skipAutoInvalidation = false,
    enableOptimisticUpdates = false,
    optimisticUpdater,
    rollbackOnError = true,
    immediateInvalidation = false,
    ...mutationOptions 
  } = options;

  return useMutation({
    mutationFn,
    ...mutationOptions,
    onMutate: async (variables: TVariables) => {
      // Execute user's onMutate callback first
      let context: TContext | undefined;
      if (onMutate) {
        context = await onMutate(variables);
      }

      // Handle optimistic updates
      if (enableOptimisticUpdates && optimisticUpdater) {
        const queriesToUpdate = getQueriesToInvalidate(mutationType);
        const allQueries = [...queriesToUpdate, ...customInvalidations];
        const uniqueQueries = Array.from(new Set(allQueries));

        // Store previous data for rollback
        const previousData = new Map();
        
        // Apply optimistic updates
        for (const queryKey of uniqueQueries) {
          const previous = queryClient.getQueryData([queryKey]);
          if (previous) {
            previousData.set(queryKey, previous);
            const optimisticData = optimisticUpdater(variables, previous);
            queryClient.setQueryData([queryKey], optimisticData);
          }
        }

        // Return context with rollback data
        return { ...context, previousData } as TContext;
      }

      return context;
    },
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
        
        if (immediateInvalidation) {
          // Immediately invalidate and refetch
          const invalidationPromises = uniqueQueries.map(queryKey => 
            queryClient.refetchQueries({ queryKey: [queryKey] })
          );
          await Promise.all(invalidationPromises);
        } else {
          // Standard invalidation
          const invalidationPromises = uniqueQueries.map(queryKey => 
            queryClient.invalidateQueries({ queryKey: [queryKey], exact: false })
          );
          await Promise.all(invalidationPromises);
        }
        
        // Log invalidations in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Smart Mutation] Invalidated queries for ${mutationType}:`, uniqueQueries);
        }
      }
    },
    onError: async (error: TError, variables: TVariables, context: TContext | undefined) => {
      // Handle rollback on error
      if (rollbackOnError && context && typeof context === 'object' && 'previousData' in context) {
        const previousData = (context as any).previousData as Map<string, any>;
        
        // Rollback optimistic updates
        for (const [queryKey, data] of previousData.entries()) {
          queryClient.setQueryData([queryKey], data);
        }
      }

      // Execute user's onError callback
      if (onError) {
        await onError(error, variables, context);
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
      queryClient.invalidateQueries({ queryKey: [queryKey], exact: false })
    );
    
    await Promise.all(invalidationPromises);
    
    if (process.env.NODE_ENV === 'development') {
    }
  };

  const invalidateQueries = async (queryKeys: string[]) => {
    const invalidationPromises = queryKeys.map(queryKey => 
      queryClient.invalidateQueries({ queryKey: [queryKey], exact: false })
    );
    
    await Promise.all(invalidationPromises);
    
    if (process.env.NODE_ENV === 'development') {
    }
  };

  return {
    invalidateByMutationType,
    invalidateQueries,
    queryClient
  };
};

export default useSmartMutation;