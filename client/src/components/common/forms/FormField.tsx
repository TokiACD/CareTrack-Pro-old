import React from 'react';
import {
  TextField,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Autocomplete,
  TextFieldProps,
  FormControlProps,
  SelectProps,
  CheckboxProps,
  RadioGroupProps,
  SwitchProps,
  AutocompleteProps,
  Box
} from '@mui/material';

interface BaseFieldProps {
  name: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
}

interface TextFieldWrapperProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel';
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  inputProps?: TextFieldProps['inputProps'];
}

interface SelectFieldProps extends BaseFieldProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  onBlur?: () => void;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  multiple?: boolean;
  displayEmpty?: boolean;
  placeholder?: string;
}

interface CheckboxFieldProps extends BaseFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: CheckboxProps['color'];
}

interface RadioGroupFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean; helperText?: string }>;
  row?: boolean;
}

interface SwitchFieldProps extends BaseFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: SwitchProps['color'];
}

interface AutocompleteFieldProps extends BaseFieldProps {
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  options: any[];
  getOptionLabel?: (option: any) => string;
  isOptionEqualToValue?: (option: any, value: any) => boolean;
  multiple?: boolean;
  freeSolo?: boolean;
  loading?: boolean;
  placeholder?: string;
}

// Base form field wrapper
const FieldWrapper: React.FC<{
  children: React.ReactNode;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}> = ({ children, error, helperText, fullWidth = true }) => (
  <Box sx={{ width: fullWidth ? '100%' : 'auto', mb: 2 }}>
    {children}
    {(error || helperText) && (
      <FormHelperText error={!!error}>
        {error || helperText}
      </FormHelperText>
    )}
  </Box>
);

// Text field component
export const FormTextField: React.FC<TextFieldWrapperProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required,
  fullWidth = true,
  disabled,
  type = 'text',
  multiline,
  rows,
  placeholder,
  inputProps,
  ...props
}) => (
  <FieldWrapper error={error} helperText={helperText} fullWidth={fullWidth}>
    <TextField
      name={name}
      label={label}
      value={value}
      onChange={(e) => {
        const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
        onChange(newValue);
      }}
      onBlur={onBlur}
      error={!!error}
      required={required}
      fullWidth={fullWidth}
      disabled={disabled}
      type={type}
      multiline={multiline}
      rows={rows}
      placeholder={placeholder}
      inputProps={inputProps}
      {...props}
    />
  </FieldWrapper>
);

// Select field component
export const FormSelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  options,
  error,
  helperText,
  required,
  fullWidth = true,
  disabled,
  multiple,
  displayEmpty,
  placeholder,
  ...props
}) => (
  <FieldWrapper error={error} helperText={helperText} fullWidth={fullWidth}>
    <FormControl fullWidth={fullWidth} error={!!error} required={required} disabled={disabled}>
      {label && <FormLabel>{label}</FormLabel>}
      <Select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        multiple={multiple}
        displayEmpty={displayEmpty}
        {...props}
      >
        {displayEmpty && placeholder && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </FieldWrapper>
);

// Checkbox field component
export const FormCheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  checked,
  onChange,
  error,
  helperText,
  disabled,
  color = 'primary',
  ...props
}) => (
  <FieldWrapper error={error} helperText={helperText} fullWidth={false}>
    <FormControlLabel
      control={
        <Checkbox
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          color={color}
          {...props}
        />
      }
      label={label}
    />
  </FieldWrapper>
);

// Radio group field component
export const FormRadioGroupField: React.FC<RadioGroupFieldProps> = ({
  name,
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  required,
  disabled,
  row,
  ...props
}) => (
  <FieldWrapper error={error} helperText={helperText} fullWidth={true}>
    <FormControl component="fieldset" error={!!error} required={required} disabled={disabled}>
      {label && <FormLabel component="legend">{label}</FormLabel>}
      <RadioGroup
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        row={row}
        {...props}
      >
        {options.map((option) => (
          <Box key={option.value}>
            <FormControlLabel
              value={option.value}
              control={<Radio />}
              label={option.label}
              disabled={option.disabled}
            />
            {option.helperText && (
              <FormHelperText sx={{ ml: 4, mt: -1 }}>
                {option.helperText}
              </FormHelperText>
            )}
          </Box>
        ))}
      </RadioGroup>
    </FormControl>
  </FieldWrapper>
);

// Switch field component
export const FormSwitchField: React.FC<SwitchFieldProps> = ({
  name,
  label,
  checked,
  onChange,
  error,
  helperText,
  disabled,
  color = 'primary',
  ...props
}) => (
  <FieldWrapper error={error} helperText={helperText} fullWidth={false}>
    <FormControlLabel
      control={
        <Switch
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          color={color}
          {...props}
        />
      }
      label={label}
    />
  </FieldWrapper>
);

// Autocomplete field component
export const FormAutocompleteField: React.FC<AutocompleteFieldProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  options,
  getOptionLabel,
  isOptionEqualToValue,
  error,
  helperText,
  required,
  fullWidth = true,
  disabled,
  multiple,
  freeSolo,
  loading,
  placeholder,
  ...props
}) => (
  <FieldWrapper error={error} helperText={helperText} fullWidth={fullWidth}>
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      onBlur={onBlur}
      options={options}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      multiple={multiple}
      freeSolo={freeSolo}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          name={name}
          label={label}
          placeholder={placeholder}
          required={required}
          error={!!error}
          fullWidth={fullWidth}
        />
      )}
      {...props}
    />
  </FieldWrapper>
);

// Form section wrapper for grouping related fields
export const FormSection: React.FC<{
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  sx?: any;
}> = ({ title, subtitle, children, sx }) => (
  <Box sx={{ mb: 4, ...sx }}>
    {title && (
      <Box sx={{ mb: 2 }}>
        <FormLabel component="legend" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {title}
        </FormLabel>
        {subtitle && (
          <FormHelperText sx={{ mt: 0.5 }}>
            {subtitle}
          </FormHelperText>
        )}
      </Box>
    )}
    {children}
  </Box>
);