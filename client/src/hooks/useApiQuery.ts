import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useNotification } from '../components/common/feedback/NotificationManager';
import { apiService } from '../services/api';

// Extended query options with common patterns
export interface ExtendedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  showErrorNotification?: boolean;
  errorMessage?: string;
  dependencies?: any[];
}

// Extended mutation options with common patterns
export interface ExtendedMutationOptions<TData, TError, TVariables> 
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
  successMessage?: string;
  errorMessage?: string;
  invalidateQueries?: string[];
  customInvalidations?: string[];
}

// Generic API query hook
export function useApiQuery<T>(
  queryKey: string[],
  endpoint: string,
  options: ExtendedQueryOptions<T> = {}
) {
  const { showError } = useNotification();
  
  const {
    showErrorNotification = true,
    errorMessage = 'Failed to load data',
    dependencies = [],
    ...queryOptions
  } = options;

  return useQuery<T>({
    queryKey: [...queryKey, ...dependencies],
    queryFn: async () => {
      const response = await apiService.get(endpoint);
      return response?.data || response;
    },
    onError: (error: any) => {
      if (showErrorNotification) {
        const message = error?.response?.data?.error || error?.message || errorMessage;
        showError(message);
      }
    },
    ...queryOptions
  });
}

// Generic API mutation hook
export function useApiMutation<TData = any, TError = Error, TVariables = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options: ExtendedMutationOptions<TData, TError, TVariables> = {}
) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  const {
    showSuccessNotification = false,
    showErrorNotification = true,
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed',
    invalidateQueries = [],
    customInvalidations = [],
    onSuccess,
    onError,
    ...mutationOptions
  } = options;

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      let response;
      const data = variables as any;
      
      switch (method) {
        case 'POST':
          response = await apiService.post(endpoint, data);
          break;
        case 'PUT':
          response = await apiService.put(endpoint, data);
          break;
        case 'PATCH':
          response = await apiService.patch(endpoint, data);
          break;
        case 'DELETE':
          response = await apiService.delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      return response?.data || response;
    },
    onSuccess: (data, variables, context) => {
      // Show success notification
      if (showSuccessNotification) {
        showSuccess(successMessage);
      }
      
      // Invalidate queries
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }
      
      if (customInvalidations.length > 0) {
        customInvalidations.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }
      
      // Call custom onSuccess
      onSuccess?.(data, variables, context);
    },
    onError: (error: any, variables, context) => {
      // Show error notification
      if (showErrorNotification) {
        const message = error?.response?.data?.error || error?.message || errorMessage;
        showError(message);
      }
      
      // Call custom onError
      onError?.(error, variables, context);
    },
    ...mutationOptions
  });
}

// Specific hooks for common patterns
export function useCreateMutation<TData = any, TVariables = any>(
  endpoint: string,
  options: ExtendedMutationOptions<TData, Error, TVariables> = {}
) {
  return useApiMutation(endpoint, 'POST', {
    showSuccessNotification: true,
    successMessage: 'Created successfully',
    ...options
  });
}

export function useUpdateMutation<TData = any, TVariables = any>(
  endpoint: string,
  options: ExtendedMutationOptions<TData, Error, TVariables> = {}
) {
  return useApiMutation(endpoint, 'PATCH', {
    showSuccessNotification: true,
    successMessage: 'Updated successfully',
    ...options
  });
}

export function useDeleteMutation<TData = any, TVariables = any>(
  endpoint: string,
  options: ExtendedMutationOptions<TData, Error, TVariables> = {}
) {
  return useApiMutation(endpoint, 'DELETE', {
    showSuccessNotification: true,
    successMessage: 'Deleted successfully',
    ...options
  });
}

// Hook for paginated queries
export function usePaginatedQuery<T>(
  queryKey: string[],
  endpoint: string,
  page: number = 1,
  limit: number = 10,
  options: ExtendedQueryOptions<T> = {}
) {
  const paginatedEndpoint = `${endpoint}?page=${page}&limit=${limit}`;
  
  return useApiQuery<T>(
    [...queryKey, 'page', page, 'limit', limit],
    paginatedEndpoint,
    options
  );
}

// Hook for search queries with debouncing
export function useSearchQuery<T>(
  queryKey: string[],
  endpoint: string,
  searchTerm: string,
  options: ExtendedQueryOptions<T> = {}
) {
  const searchEndpoint = searchTerm 
    ? `${endpoint}?search=${encodeURIComponent(searchTerm)}`
    : endpoint;
    
  return useApiQuery<T>(
    [...queryKey, 'search', searchTerm],
    searchEndpoint,
    {
      enabled: searchTerm.length >= 2, // Only search with 2+ characters
      ...options
    }
  );
}

// Hook for dependent queries (queries that depend on other data)
export function useDependentQuery<T>(
  queryKey: string[],
  endpoint: string,
  dependencies: Record<string, any>,
  options: ExtendedQueryOptions<T> = {}
) {
  const dependencyValues = Object.values(dependencies);
  const hasAllDependencies = dependencyValues.every(dep => 
    dep !== null && dep !== undefined && dep !== ''
  );
  
  const params = new URLSearchParams();
  Object.entries(dependencies).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        params.append(key, value.join(','));
      } else {
        params.append(key, String(value));
      }
    }
  });
  
  const fullEndpoint = params.toString() ? `${endpoint}?${params}` : endpoint;
  
  return useApiQuery<T>(
    [...queryKey, ...dependencyValues],
    fullEndpoint,
    {
      enabled: hasAllDependencies,
      ...options
    }
  );
}