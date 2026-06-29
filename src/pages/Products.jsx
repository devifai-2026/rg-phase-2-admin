import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Avatar, Alert, Chip, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { AdminAPI, PublicAPI } from '../api/endpoints';
import { PageHeader, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { actionsColumn } from '../components/tableHelpers';

export default function Products() {
  const navigate = useNavigate();
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const p = await PublicAPI.products({ limit: 200 }); setRows(p.data.data.items.map((x) => ({ id: x._id, ...x }))); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onDelete = async (row) => { if (!window.confirm(`Delete ${row.name}?`)) return; try { await AdminAPI.deleteProduct(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };

  const LOW = 10;
  const base = search ? rows.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase())) : rows;
  // Low-stock first (most critical at top), then by stock ascending, then name.
  const filtered = [...base].sort((a, b2) => {
    const la = a.stock < LOW, lb = b2.stock < LOW;
    if (la !== lb) return la ? -1 : 1;
    if (a.stock !== b2.stock) return a.stock - b2.stock;
    return (a.name || '').localeCompare(b2.name || '');
  });
  const lowStock = rows.filter((r) => r.stock < LOW);

  const columns = [
    {
      field: 'name', headerName: 'Product', flex: 1, minWidth: 240,
      renderCell: (p) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: '100%', width: '100%' }}>
          <Avatar variant="rounded" src={p.row.images?.[0]} sx={{ width: 34, height: 34, flexShrink: 0 }}>{p.row.name?.[0]}</Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{p.value}</Typography>
        </Stack>
      ),
    },
    { field: 'categoryName', headerName: 'Category', width: 150, valueGetter: (v) => v || '—' },
    {
      field: 'price', headerName: 'Price', width: 160, type: 'number', align: 'right', headerAlign: 'right',
      renderCell: (p) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', lineHeight: 1.25, width: '100%' }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, color: b.red }}>{rupees(p.value)}</span>
            {p.row.mrp > p.value && <span style={{ color: b.textFaint, textDecoration: 'line-through', fontSize: 11 }}>{rupees(p.row.mrp)}</span>}
          </Box>
          {p.row.mrp > p.value && <span style={{ color: b.green, fontSize: 10, fontWeight: 700, lineHeight: 1.1 }}>{Math.round(((p.row.mrp - p.value) / p.row.mrp) * 100)}% off</span>}
        </Box>
      ),
    },
    { field: 'stock', headerName: 'Stock', width: 100, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <Chip size="small" label={p.value} sx={{ background: p.value < 10 ? `${b.red}22` : `${b.green}22`, color: p.value < 10 ? b.red : b.green, fontWeight: 700 }} /> },
    { field: 'rating', headerName: 'Rating', width: 90, type: 'number', align: 'right', headerAlign: 'right', valueFormatter: (v) => v ? v.toFixed(1) : '—' },
    actionsColumn({
      count: 2,
      getActions: (row) => [
        { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => navigate(`/products/${row._id}/edit`) },
        { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => onDelete(row) },
      ],
    }),
  ];

  return (
    <>
      <PageHeader title="Products" subtitle="Inventory & catalog management"
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/products/new')}>Add Product</Button>} />
      {lowStock.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, background: alpha(b.amber, 0.1), color: b.text, border: `1px solid ${alpha(b.amber, 0.3)}`, '& .MuiAlert-icon': { color: b.amber } }}>
          {lowStock.length} product(s) low on stock (&lt;10): {lowStock.slice(0, 5).map((p) => p.name).join(', ')}
        </Alert>
      )}
      <AdminTable rows={filtered} columns={columns} loading={loading} title="Catalog"
        search={{ value: search, onChange: setSearch, placeholder: 'Search products…' }}
        getRowClassName={(p) => (p.row.stock < LOW ? 'row-lowstock' : '')}
        rowSx={{
          '& .row-lowstock': { background: alpha(b.red, 0.07) },
          '& .row-lowstock:hover': { background: alpha(b.red, 0.12) },
          '& .row-lowstock .MuiDataGrid-cell:first-of-type': { boxShadow: `inset 3px 0 0 ${b.red}` },
        }}
        emptyTitle="No products yet" emptyHint="Add your first product" />
    </>
  );
}
