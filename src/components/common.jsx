import { Box, Typography, Chip, Stack } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

/** Page title block — Fraunces title, optional subtitle, right-aligned action. */
export function PageHeader({ title, subtitle, action }) {
  const { palette } = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2.5, gap: 2, flexWrap: 'wrap' }}>
      <Box>
        <Typography variant="h4" sx={{ color: palette.brand.text, lineHeight: 1.1 }}>{title}</Typography>
        {subtitle && <Typography variant="body2" sx={{ color: palette.brand.textDim, mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {action}
    </Box>
  );
}

// status → semantic token name
const STATUS_TONE = {
  active: 'green', online: 'green', available: 'green', approved: 'green', paid: 'green', completed: 'green', delivered: 'green', resolved: 'green', confirmed: 'green',
  pending: 'amber', requested: 'amber', open: 'amber', ringing: 'amber', packed: 'amber', scheduled: 'amber', processing: 'blue', in_progress: 'blue', shipped: 'blue',
  rejected: 'red', failed: 'red', missed: 'red', cancelled: 'red', suspended: 'red', refunded: 'red', expired: 'red',
  inactive: 'faint',
  busy: 'violet', ongoing: 'violet', out_for_delivery: 'violet',
  offline: 'faint', created: 'faint',
};

export function StatusChip({ status, size = 'small' }) {
  const { palette } = useTheme();
  const b = palette.brand;
  const tone = STATUS_TONE[status] || 'faint';
  const color = tone === 'faint' ? b.textDim : b[tone];
  return (
    <Chip size={size} label={String(status || '—').replace(/_/g, ' ')}
      sx={{ background: alpha(color, 0.14), color, fontWeight: 600, textTransform: 'capitalize', border: `1px solid ${alpha(color, 0.25)}` }} />
  );
}

/** Money: backend stores whole rupees. */
export const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
export const maskAccount = (acc) => (acc ? `XXXX${String(acc).slice(-4)}` : '—');
