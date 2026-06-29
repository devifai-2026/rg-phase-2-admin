import { TextField, InputAdornment } from '@mui/material';
import { Controller } from 'react-hook-form';

/**
 * Validation rule presets for react-hook-form `register`, so every form across
 * the admin enforces the same rules and shows inline errors consistently.
 */
export const rules = {
  required: (label = 'This field') => ({ required: `${label} is required` }),
  phone: {
    required: 'Phone is required',
    pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit phone' },
  },
  email: {
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
  },
  money: (label = 'Amount') => ({
    required: `${label} is required`,
    min: { value: 0, message: 'Cannot be negative' },
    max: { value: 1000000, message: 'Too large' },
    validate: (v) => Number.isInteger(Number(v)) || 'Whole rupees only',
  }),
  // Per-minute rate / admin cut: whole rupees, 0–100.
  ratePerMin: (label = 'Rate') => ({
    required: `${label} is required`,
    min: { value: 0, message: 'Cannot be negative' },
    max: { value: 100, message: 'Max ₹100/min' },
    validate: (v) => Number.isInteger(Number(v)) || 'Whole rupees only',
  }),
  positiveInt: (label = 'Value') => ({
    required: `${label} is required`,
    min: { value: 0, message: 'Cannot be negative' },
    validate: (v) => Number.isInteger(Number(v)) || 'Whole numbers only',
  }),
  rating: { required: 'Rating required', min: { value: 1, message: '1–5' }, max: { value: 5, message: '1–5' } },
};

/**
 * Text/number field bound to react-hook-form with error display baked in.
 * <Field name="x" label="X" register={register} errors={errors} rules={...} />
 */
export function Field({ name, label, register, errors, rules: r, type = 'text', InputLabelProps, ...rest }) {
  const err = errors?.[name];
  return (
    <TextField
      label={label}
      type={type}
      fullWidth
      error={!!err}
      helperText={err?.message || ' '}
      // Keep the label shrunk so values set via reset()/async load never sit
      // under the floating label (fixes value/label overlap).
      InputLabelProps={{ shrink: true, ...InputLabelProps }}
      inputProps={type === 'number' ? { min: 0, ...rest.inputProps } : rest.inputProps}
      {...register(name, r)}
      {...rest}
    />
  );
}

/**
 * Phone input with a fixed +91 prefix. The form value is the bare 10-digit
 * number; the backend normalizes/stores it as 91+10. Use with control from useForm.
 */
export function PhoneField({ name = 'phone', label = 'Phone number', control, required = true, ...rest }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={required ? { required: 'Phone is required', pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit number' } } : { pattern: { value: /^\d{10}$/, message: 'Enter a valid 10-digit number' } }}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          value={field.value || ''}
          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
          label={label}
          fullWidth
          error={!!fieldState.error}
          helperText={fieldState.error?.message || ' '}
          InputLabelProps={{ shrink: true }}
          InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }}
          inputProps={{ inputMode: 'numeric', maxLength: 10 }}
          {...rest}
        />
      )}
    />
  );
}
