import { Stack, IconButton, Tooltip, Box } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { StatusChip, rupees } from './common';

/**
 * Column builders that enforce consistency across every table:
 * money right-aligned, status as chips, actions always rightmost.
 */

function MoneyCell({ value, signed, type }) {
  const { palette } = useTheme();
  const b = palette.brand;
  if (value == null || value === '') return <span style={{ color: b.textFaint }}>—</span>;
  if (signed) {
    const credit = type === 'credit';
    const color = credit ? b.green : b.red;
    return <span style={{ color, fontWeight: 700 }}>{credit ? '+' : '−'}{rupees(Math.abs(value))}</span>;
  }
  return <span style={{ fontWeight: 700, color: b.text }}>{rupees(value)}</span>;
}

export function moneyColumn({ field, headerName, width = 130, signed = false, accent = false }) {
  return {
    field, headerName, width, type: 'number', align: 'right', headerAlign: 'right', sortable: true,
    renderCell: (p) => <MoneyCellWrap value={p.value} signed={signed} type={p.row.type} accent={accent} />,
  };
}
function MoneyCellWrap({ value, signed, type, accent }) {
  const { palette } = useTheme();
  if (accent && !signed) return <span style={{ fontWeight: 700, color: palette.brand.red }}>{value == null ? '—' : rupees(value)}</span>;
  return <MoneyCell value={value} signed={signed} type={type} />;
}

export function statusColumn({ field = 'status', headerName = 'Status', width = 130, valueGetter } = {}) {
  return {
    field, headerName, width, headerAlign: 'left',
    ...(valueGetter ? { valueGetter } : {}),
    renderCell: (p) => <StatusChip status={p.value} />,
  };
}

export function dateColumn({ field, headerName, width = 160, withTime = true } = {}) {
  return {
    field, headerName, width,
    valueFormatter: (v) => {
      if (!v) return '—';
      const d = new Date(v);
      return withTime ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-IN');
    },
  };
}

/** Standardized row actions: icon buttons flush-right, fixed order/colors.
 *  view/edit = neutral (hover red), destructive = red. Always pinned right so
 *  every table's action icons line up identically. */
export function RowActions({ actions = [] }) {
  const { palette } = useTheme();
  const b = palette.brand;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ height: '100%', width: '100%' }}>
      {actions.filter(Boolean).map((a, i) => {
        const tone = a.danger ? b.red : a.primary ? b.red : b.textDim;
        return (
          <Tooltip key={i} title={a.tip || ''}>
            <span>
              <IconButton size="small" onClick={a.onClick} disabled={a.disabled}
                sx={{ color: tone, '&:hover': { background: alpha(tone, 0.1), color: a.danger || a.primary ? b.red : b.text } }}>
                {a.icon}
              </IconButton>
            </span>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

/** Width auto-sizes to the number of actions so icons sit flush at the right edge. */
export function actionsColumn({ getActions, headerName = 'Actions', count = 3 }) {
  return {
    field: '__actions', headerName, width: Math.max(96, count * 38 + 24),
    sortable: false, filterable: false, align: 'right', headerAlign: 'right', disableColumnMenu: true,
    renderCell: (p) => <RowActions actions={getActions(p.row)} />,
  };
}

/** A primary text-button action cell (e.g. "Process Payout") kept consistent. */
export function PrimaryCellButton({ children, onClick, disabled }) {
  const { palette } = useTheme();
  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        cursor: 'pointer', border: 'none', borderRadius: 8, px: 1.5, py: 0.6, fontWeight: 700, fontSize: 12.5,
        color: '#fff', background: palette.brand.gradients.red, fontFamily: 'inherit',
        '&:hover': { background: palette.brand.gradients.redDeep }, '&:disabled': { opacity: 0.5, cursor: 'default' },
      }}
    >
      {children}
    </Box>
  );
}
