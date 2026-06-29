import { Box, Typography, Button, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';

export default function Forbidden() {
  const navigate = useNavigate();
  const { palette } = useTheme();
  const C = palette.brand;
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Stack alignItems="center" spacing={2}>
        <LockIcon sx={{ fontSize: 64, color: C.red }} />
        <Typography variant="h3">403</Typography>
        <Typography variant="h6">Restricted area</Typography>
        <Typography sx={{ color: C.textDim, textAlign: 'center', maxWidth: 380 }}>
          This section is reserved for Super Admins. Your account doesn't have access.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </Stack>
    </Box>
  );
}
