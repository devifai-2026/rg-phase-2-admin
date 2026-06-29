import { Box, Typography, Stack } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import InboxIcon from '@mui/icons-material/InboxOutlined';

/** Small, quiet empty state — never a giant void. */
export default function EmptyState({ title = 'Nothing here yet', hint, icon }) {
  const { palette } = useTheme();
  const b = palette.brand;
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ height: '100%', minHeight: 160, py: 4, color: b.textDim }}>
      <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', background: alpha(b.textFaint, 0.12), color: b.textFaint }}>
        {icon || <InboxIcon fontSize="small" />}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600, color: b.text }}>{title}</Typography>
      {hint && <Typography variant="caption" sx={{ color: b.textFaint }}>{hint}</Typography>}
    </Stack>
  );
}
