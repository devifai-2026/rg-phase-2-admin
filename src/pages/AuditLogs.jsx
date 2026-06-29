import { useEffect, useState, useCallback } from 'react';
import { Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';
import AdminTable from '../components/AdminTable';
import { dateColumn } from '../components/tableHelpers';

export default function AuditLogs() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('users'); // 'users' = app-user activity only

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.auditLogs({ limit: 100, scope }); setRows(data.data.items.map((a) => ({ id: a._id, ...a, actorName: a.actor?.name || a.actor?.phone, targetName: a.target }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [scope]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    dateColumn({ field: 'createdAt', headerName: 'When', width: 170 }),
    { field: 'actorName', headerName: 'Actor', width: 150 },
    { field: 'actorRole', headerName: 'Role', width: 130, renderCell: (p) => <Chip size="small" label={p.value === 'super_admin' ? 'Super Admin' : 'Admin'} sx={{ background: p.value === 'super_admin' ? `${b.red}22` : `${b.violet}22`, color: p.value === 'super_admin' ? b.red : b.violet }} /> },
    { field: 'targetType', headerName: 'Affects', width: 110, valueGetter: (v) => v || '—', renderCell: (p) => <Chip size="small" label={p.value} sx={{ textTransform: 'capitalize', background: `${b.blue}1F`, color: b.blue }} /> },
    { field: 'action', headerName: 'Action', width: 160 },
    { field: 'summary', headerName: 'Details', flex: 1, minWidth: 280 },
  ];

  const scopeToggle = (
    <ToggleButtonGroup size="small" exclusive value={scope} onChange={(e, v) => v && setScope(v)}>
      <ToggleButton value="users">App-user activity</ToggleButton>
      <ToggleButton value="all">All actions</ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <>
      <PageHeader title="Audit Logs"
        subtitle={scope === 'users' ? 'Privileged actions that affect app users' : 'Every privileged action, recorded'}
        action={scopeToggle} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="Activity trail"
        emptyTitle={scope === 'users' ? 'No user-affecting actions yet' : 'No audit entries yet'} pageSizeOptions={[25, 50, 100]} />
    </>
  );
}
