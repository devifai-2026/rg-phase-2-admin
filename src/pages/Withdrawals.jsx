import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { AdminAPI } from '../api/endpoints';
import { useActivity } from '../activity/ActivityContext';
import { Stack, IconButton, Tooltip } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { PageHeader, StatusChip, maskAccount } from '../components/common';
import AdminTable from '../components/AdminTable';
import { moneyColumn, statusColumn, dateColumn, PrimaryCellButton } from '../components/tableHelpers';

function WithdrawalActions({ row, onProcess, onReject }) {
  const { palette } = useTheme();
  if (row.status !== 'pending') return <StatusChip status={row.status} />;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ height: '100%' }}>
      <PrimaryCellButton onClick={() => onProcess(row)}>Process Payout</PrimaryCellButton>
      <Tooltip title="Reject"><IconButton size="small" onClick={() => onReject(row)} sx={{ color: palette.brand.red }}><CloseIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  );
}

export default function Withdrawals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { clear } = useActivity();
  // Opening this page clears both the withdrawal-request badge and the
  // bank-account-update badge (bank changes are reviewed here).
  useEffect(() => { clear('withdrawal'); clear('bank_account'); }, [clear]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listWithdrawals({ limit: 100 }); setRows(data.data.items.map((w) => ({ id: w._id, ...w, astroName: w.astrologer?.name }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const process = async (w) => {
    try { await AdminAPI.approveWithdrawal(w._id, 'Processed via admin panel'); toast.success('Payout queued'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const reject = async (w) => {
    const note = window.prompt('Reason for rejection?') || '';
    try { await AdminAPI.rejectWithdrawal(w._id, note); toast.success('Rejected'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const columns = [
    { field: 'astroName', headerName: 'Astrologer', flex: 1, minWidth: 150, valueGetter: (v, r) => v || r.astrologer?.phone },
    moneyColumn({ field: 'amount', headerName: 'Amount', accent: true }),
    { field: 'bank', headerName: 'Bank (masked)', width: 150, valueGetter: (v, r) => r.bankAccountDetails?.upi || maskAccount(r.bankAccountDetails?.accountNumber) },
    { field: 'ifsc', headerName: 'IFSC', width: 110, valueGetter: (v, r) => r.bankAccountDetails?.ifsc || '—' },
    statusColumn({ field: 'status', headerName: 'Status' }),
    dateColumn({ field: 'requestedAt', headerName: 'Requested' }),
    {
      field: '__actions', headerName: 'Actions', width: 180, sortable: false, align: 'right', headerAlign: 'right',
      renderCell: (p) => p.row.status === 'pending'
        ? (
          <RowActions actions={[
            { icon: <CloseIcon fontSize="small" />, tip: 'Reject', danger: true, onClick: () => reject(p.row) },
          ]} extra={<PrimaryCellButton onClick={() => process(p.row)}>Process Payout</PrimaryCellButton>} />
        )
        : <StatusChip status={p.row.status} />,
    },
  ];

  return (
    <>
      <PageHeader title="Withdrawals" subtitle="Process astrologer payouts · bank details masked for security" />
      <AdminTable rows={rows} columns={columns} loading={loading} title="Payout requests"
        emptyTitle="No withdrawal requests" emptyHint="Approved payouts will appear here" />
    </>
  );
}
