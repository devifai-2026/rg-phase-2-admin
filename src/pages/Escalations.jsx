import { useEffect, useState, useCallback } from 'react';
import DoneIcon from '@mui/icons-material/DoneAll';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { useActivity } from '../activity/ActivityContext';
import { PageHeader } from '../components/common';
import AdminTable from '../components/AdminTable';
import { statusColumn, dateColumn, actionsColumn } from '../components/tableHelpers';

export default function Escalations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { clear } = useActivity();
  // Support tickets route here too, so clear both badges on visit.
  useEffect(() => { clear('escalation'); clear('support'); }, [clear]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listEscalations({ status: 'open', limit: 100 }); setRows(data.data.items.map((e) => ({ id: e._id, ...e, astroName: e.astrologer?.name }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const resolve = async (e) => { try { await AdminAPI.resolveEscalation(e._id, 'Reviewed'); toast.success('Resolved'); load(); } catch { toast.error('Failed'); } };

  const columns = [
    { field: 'astroName', headerName: 'Astrologer', flex: 1, minWidth: 150, valueGetter: (v, r) => v || r.astrologer?.phone },
    { field: 'type', headerName: 'Type', width: 160, valueFormatter: (v) => String(v || '').replace(/_/g, ' ') },
    { field: 'missCount', headerName: 'Misses', width: 90, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'reason', headerName: 'Reason', flex: 1.5, minWidth: 220 },
    statusColumn({ field: 'status' }),
    dateColumn({ field: 'createdAt', headerName: 'Raised' }),
    actionsColumn({
      count: 1, headerName: 'Resolve',
      getActions: (row) => [{ icon: <DoneIcon fontSize="small" />, tip: 'Mark resolved', primary: true, onClick: () => resolve(row) }],
    }),
  ];

  return (
    <>
      <PageHeader title="Escalations" subtitle="Astrologers flagged for frequent missed/rejected requests" />
      <AdminTable rows={rows} columns={columns} loading={loading} title="Open escalations"
        emptyTitle="No open escalations" emptyHint="Flagged astrologers will appear here" />
    </>
  );
}
