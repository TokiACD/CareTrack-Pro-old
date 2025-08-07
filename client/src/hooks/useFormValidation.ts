import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  test: (value: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface FormValidationState {
  errors: ValidationErrors;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormValidationActions {
  validate: (field?: string) => boolean;
  validateField: (field: string, value: any) => string | null;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  reset: () => void;
}

export function useFormValidation(
  values: Record<string, any>,
  rules: ValidationRules
): FormValidationState & FormValidationActions {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  const validateField = useCallback((field: string, value: any): string | null => {
    const fieldRules = rules[field];
    if (!fieldRules) return null;

    for (const rule of fieldRules) {
      if (!rule.test(value)) {
        return rule.message;
      }
    }
    return null;
  }, [rules]);

  const validate = useCallback((field?: string): boolean => {
    if (field) {
      // Validate single field
      const error = validateField(field, values[field]);
      setErrors(prev => ({
        ...prev,
        [field]: error || ''
      }));
      setIsDirty(true);
      return !error;
    } else {
      // Validate all fields
      const newErrors: ValidationErrors = {};
      let isValid = true;

      Object.keys(rules).forEach(fieldName => {
        const error = validateField(fieldName, values[fieldName]);
        if (error) {
          newErrors[fieldName] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      setIsDirty(true);
      return isValid;
    }
  }, [values, rules, validateField]);

  const setError = useCallback((field: string, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: message
    }));
    setIsDirty(true);
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setIsDirty(false);
  }, []);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  return {
    errors,
    isValid,
    isDirty,
    validate,
    validateField,
    setError,
    clearError,
    clearAllErrors,
    reset
  };
}

export function useValidatedForm<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules
) {
  const [values, setValues] = useState<T>(initialValues);
  const validation = useFormValidation(values, validationRules);

  const setValue = useCallback((field: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    validation.reset();
  }, [initialValues, validation]);

  return {
    values,
    setValue,
    setValues,
    reset,
    ...validation
  };
}

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value: any) => value !== null && value !== undefined && value !== '',
    message
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value: string) => {
      if (!value) return true; // Allow empty if not required
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value: string) => {
      if (!value) return true; // Allow empty if not required
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters long`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value: string) => {
      if (!value) return true; // Allow empty if not required
      return value.length <= max;
    },
    message: message || `Must be no more than ${max} characters long`
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    test: (value: string) => {
      if (!value) return true; // Allow empty if not required
      return regex.test(value);
    },
    message
  }),

  numeric: (message = 'Must be a number'): ValidationRule => ({
    test: (value: any) => {
      if (!value) return true; // Allow empty if not required
      return !isNaN(Number(value));
    },
    message
  }),

  min: (min: number, message?: string): ValidationRule => ({
    test: (value: any) => {
      if (!value) return true; // Allow empty if not required
      return Number(value) >= min;
    },
    message: message || `Must be at least ${min}`
  }),

  max: (max: number, message?: string): ValidationRule => ({
    test: (value: any) => {
      if (!value) return true; // Allow empty if not required
      return Number(value) <= max;
    },
    message: message || `Must be no more than ${max}`
  })
};