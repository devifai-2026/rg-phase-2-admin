import { Toaster } from 'react-hot-toast';
import { useTheme } from '@mui/material/styles';

/** Toaster whose styling tracks the active light/dark theme. */
export default function AppToaster() {
  const { palette } = useTheme();
  const b = palette.brand;
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3200,
        style: {
          background: b.surface2,
          color: b.text,
          border: `1px solid ${b.border}`,
          borderRadius: 11,
          fontSize: 13.5,
          fontWeight: 500,
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.45)',
        },
        success: { iconTheme: { primary: b.green, secondary: b.surface } },
        error: { iconTheme: { primary: b.red, secondary: b.surface } },
      }}
    />
  );
}
