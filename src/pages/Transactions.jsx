import { useEffect, useState, useCallback } from 'react';
import { Box, Grid, Card, CardContent, Typography, Stack, Chip, ToggleButton, ToggleButtonGroup, TextField, MenuItem, Avatar } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import ArrowUpIcon from '@mui/icons-material/SouthWest';
import ArrowDownIcon from '@mui/icons-material/NorthEast';
import ScaleIcon from '@mui/icons-material/AccountBalance';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { dateColumn } from '../components/tableHelpers';

const SOURCES = ['recharge', 'call', 'chat', 'video', 'gift', 'product', 'withdrawal', 'refund', 'bonus', 'earning', 'adjustment', 'admin_manual'];

function SummaryCard({ icon, label, value, color }) {
  const { palette } = useTheme();
  const b = palette.brand;
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.75 }}>
        <Avatar variant="rounded" sx={{ background: alpha(color, 0.14), color, width: 38, height: 38 }}>{icon}</Avatar>
        <Box>
          <Typography variant="caption" sx={{ color: b.textDim }}>{label}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: b.text, lineHeight: 1.1 }}>{rupees(value)}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Transactions() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ moneyIn: 0, moneyOut: 0, platformEarnings: 0 });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');

  const params = useCallback(() => ({
    type: type || undefined,
    source: source || undefined,
    search: search || undefined,
  }), [type, source, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = { ...params(), page: paginationModel.page + 1, limit: paginationModel.pageSize };
      const [list, sum] = await Promise.all([
        AdminAPI.listTransactions(p),
        AdminAPI.transactionsSummary(params()),
      ]);
      setRows(list.data.data.items.map((t) => ({ id: t._id, ...t, userName: t.user?.name || t.user?.phone })));
      setRowCount(list.data.data.total);
      setSummary(sum.data.data);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [params, paginationModel]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const columns = [
    dateColumn({ field: 'createdAt', headerName: 'Date', width: 150 }),
    { field: 'userName', headerName: 'User', flex: 1, minWidth: 150 },
    { field: 'type', headerName: 'Type', width: 100, renderCell: (p) => <StatusChip status={p.value === 'credit' ? 'completed' : 'failed'} /> },
    { field: 'source', headerName: 'Source', width: 130, renderCell: (p) => <Chip size="small" label={String(p.value).replace(/_/g, ' ')} sx={{ background: alpha(b.textFaint, 0.12), color: b.textDim, textTransform: 'capitalize' }} /> },
    {
      field: 'amount', headerName: 'Amount', width: 130, type: 'number', align: 'right', headerAlign: 'right',
      renderCell: (p) => {
        const credit = p.row.type === 'credit';
        return <span style={{ color: credit ? b.green : b.red, fontWeight: 700 }}>{credit ? '+' : '−'}{rupees(p.value)}</span>;
      },
    },
    { field: 'balanceAfter', headerName: 'Balance', width: 110, type: 'number', align: 'right', headerAlign: 'right', valueFormatter: (v) => v == null ? '—' : rupees(v) },
    { field: 'status', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value} /> },
    { field: 'description', headerName: 'Note', flex: 1, minWidth: 160, valueGetter: (v) => v || '—' },
  ];

  const filters = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <ToggleButtonGroup size="small" exclusive value={type} onChange={(e, v) => { setType(v || ''); setPaginationModel((m) => ({ ...m, page: 0 })); }}>
        <ToggleButton value="">All</ToggleButton>
        <ToggleButton value="credit">Credit</ToggleButton>
        <ToggleButton value="debit">Debit</ToggleButton>
      </ToggleButtonGroup>
      <TextField select size="small" label="Source" value={source} onChange={(e) => { setSource(e.target.value); setPaginationModel((m) => ({ ...m, page: 0 })); }} sx={{ minWidth: 150 }}>
        <MenuItem value="">All sources</MenuItem>
        {SOURCES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</MenuItem>)}
      </TextField>
    </Stack>
  );

  return (
    <>
      <PageHeader title="Transactions" subtitle="Complete wallet ledger across all users" />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}><SummaryCard icon={<ArrowUpIcon fontSize="small" />} label="Money In" value={summary.moneyIn} color={b.green} /></Grid>
        <Grid item xs={12} sm={4}><SummaryCard icon={<ArrowDownIcon fontSize="small" />} label="Money Out" value={summary.moneyOut} color={b.red} /></Grid>
        <Grid item xs={12} sm={4}><SummaryCard icon={<ScaleIcon fontSize="small" />} label="Platform Earnings" value={summary.platformEarnings} color={b.amber} /></Grid>
      </Grid>
      <AdminTable
        rows={rows} columns={columns} loading={loading} title="Ledger"
        filters={filters}
        search={{ value: search, onChange: (v) => { setSearch(v); setPaginationModel((m) => ({ ...m, page: 0 })); }, placeholder: 'Search user…' }}
        paginationMode="server" rowCount={rowCount}
        paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
        emptyTitle="No transactions" emptyHint="Adjust filters or check back later"
      />
    </>
  );
}
