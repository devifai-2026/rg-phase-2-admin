import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { actionsColumn } from '../components/tableHelpers';

export default function Bundles() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const bd = await AdminAPI.listBundles(); setRows(bd.data.data.map((x) => ({ id: x._id, ...x }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onDelete = async (row) => { if (!window.confirm(`Delete ${row.name}?`)) return; try { await AdminAPI.deleteBundle(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };

  const columns = [
    { field: 'name', headerName: 'Bundle', flex: 1, minWidth: 200 },
    { field: 'products', headerName: 'Products', width: 100, valueGetter: (v) => `${(v || []).length} items` },
    { field: 'pricing', headerName: 'Pricing', flex: 1, minWidth: 140, valueGetter: (v, r) => r.pricingMode === 'fixed' ? `Fixed ${rupees(r.bundlePrice)}` : `${r.discountPercent}% off` },
    { field: 'isActive', headerName: 'Status', width: 110, renderCell: (p) => <StatusChip status={p.value ? 'active' : 'offline'} /> },
    actionsColumn({ count: 2, getActions: (row) => [
      { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => navigate(`/bundles/${row._id}/edit`) },
      { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => onDelete(row) },
    ] }),
  ];

  return (
    <>
      <PageHeader title="Bundles" subtitle="“Frequently bought together” combos shown on product pages"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/bundles/new')}>Add Bundle</Button>} />
      <AdminTable rows={rows} columns={columns} loading={loading} title="All bundles" emptyTitle="No bundles yet" emptyHint="Group products to upsell" />
    </>
  );
}
