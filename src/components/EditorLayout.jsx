import { Box, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from './common';
import PhoneFrame from './PhoneFrame';

/**
 * Split editor: form on the left, a live phone-frame preview on the right.
 * `form` and `preview` are render nodes; `actions` is the footer button row.
 */
export default function EditorLayout({ title, subtitle, backTo, form, preview, actions }) {
  const { palette } = useTheme();
  const b = palette.brand;
  const navigate = useNavigate();
  return (
    <>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backTo)} sx={{ color: b.textDim, mb: 1 }}>Back</Button>
      <PageHeader title={title} subtitle={subtitle} />
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
        {/* Form */}
        <Card sx={{ flex: 1, minWidth: { xs: '100%', lg: 380 }, order: { xs: 2, lg: 1 } }}>
          <CardContent sx={{ p: 3 }}>
            {form}
            {actions && <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3, pt: 2, borderTop: `1px solid ${b.borderSoft}` }}>{actions}</Stack>}
          </CardContent>
        </Card>

        {/* Live preview */}
        <Box sx={{ order: { xs: 1, lg: 2 }, position: { lg: 'sticky' }, top: 90, width: { xs: '100%', lg: 'auto' }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="overline" sx={{ color: b.textDim }}>Live app preview</Typography>
          <PhoneFrame>{preview}</PhoneFrame>
        </Box>
      </Box>
    </>
  );
}
