import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
  TextField, MenuItem, FormControlLabel, Switch, Typography, Chip, Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import PreviewIcon from '@mui/icons-material/Visibility';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, StatusChip, rupees } from '../components/common';
import AdminTable from '../components/AdminTable';
import { actionsColumn, dateColumn } from '../components/tableHelpers';
import ImageUpload from '../components/ImageUpload';

const DESIGNS = [
  { value: 1, label: 'Classic — red header ledger' },
  { value: 2, label: 'Modern — gold accent, airy' },
  { value: 3, label: 'Devotional — cream + om motif' },
];

export default function Invoices() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <PageHeader title="Invoices" subtitle="Branded invoice templates and generated invoices" />
      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label="Templates" />
          <Tab label="Generated invoices" />
        </Tabs>
      </Card>
      {tab === 0 ? <Templates b={b} /> : <Generated b={b} />}
    </Box>
  );
}

/* ─────────────────────────── Templates ─────────────────────────── */
const EMPTY = { name: '', design: 1, businessName: 'Rudraganga', logo: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', phone: '', email: '', gstin: '', footerNote: 'Thank you for choosing Rudraganga 🙏', isDefault: false, isActive: true };

function Templates({ b }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listInvoiceTemplates(); setRows(data.data.map((t) => ({ id: t._id, ...t }))); }
    catch { toast.error('Failed to load templates'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const open = (row) => { setForm({ ...EMPTY, ...(row || {}) }); setDialog(row || {}); };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Template name is required');
    const { id, _id, ...body } = form;
    try {
      if (dialog._id) await AdminAPI.updateInvoiceTemplate(dialog._id, body);
      else await AdminAPI.createInvoiceTemplate(body);
      toast.success('Saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete template "${row.name}"?`)) return;
    try { await AdminAPI.deleteInvoiceTemplate(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); }
  };
  const makeDefault = async (row) => {
    try { await AdminAPI.updateInvoiceTemplate(row._id, { isDefault: true }); toast.success('Set as default'); load(); } catch { toast.error('Failed'); }
  };

  // ── PDF preview (renders a sample invoice with the given template fields) ──
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const preview = async (tplFields) => {
    setPreviewing(true);
    try {
      const { data } = await AdminAPI.previewInvoiceTemplate(tplFields);
      const url = URL.createObjectURL(data); // blob → object URL for the iframe
      setPreviewUrl(url);
    } catch { toast.error('Preview failed'); } finally { setPreviewing(false); }
  };
  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const columns = [
    { field: 'name', headerName: 'Template', flex: 1, minWidth: 180, renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.value}</Typography> },
    { field: 'design', headerName: 'Design', width: 90, valueGetter: (v) => `#${v}` },
    { field: 'businessName', headerName: 'Business', flex: 1, minWidth: 140, valueGetter: (v) => v || '—' },
    { field: 'isDefault', headerName: 'Default', width: 110, renderCell: (p) => p.value ? <Chip size="small" label="Default" sx={{ background: b.green + '22', color: b.green, fontWeight: 700 }} /> : <Button size="small" onClick={() => makeDefault(p.row)} sx={{ color: b.textDim }}>Set default</Button> },
    actionsColumn({ count: 3, getActions: (row) => [
      { icon: <PreviewIcon fontSize="small" />, tip: 'Preview PDF', onClick: () => preview({ id: row._id }) },
      { icon: <EditIcon fontSize="small" />, tip: 'Edit', onClick: () => open(row) },
      { icon: <DeleteIcon fontSize="small" />, tip: 'Delete', danger: true, onClick: () => remove(row) },
    ] }),
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add template</Button>
      </Box>
      <AdminTable rows={rows} columns={columns} loading={loading} title="Invoice templates"
        emptyTitle="No templates yet" emptyHint="Add a template with your logo + address; mark one as default" />

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} invoice template</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField label="Template name" fullWidth value={form.name} onChange={set('name')} InputLabelProps={{ shrink: true }} placeholder="e.g. Main GST invoice" />
            <TextField select label="Design" fullWidth value={form.design} onChange={(e) => setForm((f) => ({ ...f, design: Number(e.target.value) }))} InputLabelProps={{ shrink: true }}>
              {DESIGNS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2} alignItems="center">
              <ImageUpload value={form.logo} onChange={(url) => setForm((f) => ({ ...f, logo: url }))} label="logo" variant="rounded" size={56} fallback="R" />
              <TextField label="Business name" fullWidth value={form.businessName} onChange={set('businessName')} InputLabelProps={{ shrink: true }} />
            </Stack>
            <TextField label="Address line 1" fullWidth value={form.addressLine1} onChange={set('addressLine1')} InputLabelProps={{ shrink: true }} />
            <TextField label="Address line 2" fullWidth value={form.addressLine2} onChange={set('addressLine2')} InputLabelProps={{ shrink: true }} />
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="City" fullWidth value={form.city} onChange={set('city')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={3}><TextField label="State" fullWidth value={form.state} onChange={set('state')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={3}><TextField label="PIN" fullWidth value={form.pincode} onChange={set('pincode')} InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Phone" fullWidth value={form.phone} onChange={set('phone')} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={6}><TextField label="Email" fullWidth value={form.email} onChange={set('email')} InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>
            <TextField label="GSTIN (optional)" fullWidth value={form.gstin} onChange={set('gstin')} InputLabelProps={{ shrink: true }} />
            <TextField label="Footer note" fullWidth value={form.footerNote} onChange={set('footerNote')} InputLabelProps={{ shrink: true }} />
            <FormControlLabel control={<Switch checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />} label="Use as default for all invoices" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog(null)} sx={{ color: b.textDim }}>Cancel</Button>
          <Button onClick={() => preview(form)} startIcon={<PreviewIcon />} disabled={previewing} sx={{ color: b.text }}>
            {previewing ? 'Rendering…' : 'Preview'}
          </Button>
          <Button onClick={save} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* PDF preview viewer */}
      <Dialog open={!!previewUrl} onClose={closePreview} maxWidth="md" fullWidth
        PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}`, height: '90vh' } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Invoice preview
          <Button size="small" onClick={() => previewUrl && window.open(previewUrl, '_blank')} sx={{ color: b.textDim }}>Open in new tab</Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, borderColor: b.borderSoft }}>
          {previewUrl && <iframe title="invoice-preview" src={previewUrl} style={{ width: '100%', height: '100%', border: 0, background: '#525659' }} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={closePreview} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/* ─────────────────────────── Generated invoices ─────────────────────────── */
function Generated({ b }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listInvoices({ limit: 200 }); setRows(data.data.items.map((i) => ({ id: i._id, ...i, userName: i.user?.name || i.user?.phone }))); }
    catch { toast.error('Failed to load invoices'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const regenerate = async (row) => {
    try { await AdminAPI.regenerateInvoice(row._id); toast.success('Re-generating PDF…'); setTimeout(load, 2500); } catch { toast.error('Failed'); }
  };

  const columns = [
    { field: 'invoiceNo', headerName: 'Invoice #', width: 180, renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.value}</Typography> },
    { field: 'refType', headerName: 'For', width: 90, valueGetter: (v) => v === 'pooja' ? 'Pooja' : 'Order' },
    { field: 'userName', headerName: 'Customer', flex: 1, minWidth: 140 },
    { field: 'total', headerName: 'Total', width: 110, type: 'number', align: 'right', headerAlign: 'right', renderCell: (p) => <strong style={{ color: b.red }}>{rupees(p.value)}</strong> },
    { field: 'pdfStatus', headerName: 'PDF', width: 110, renderCell: (p) => <StatusChip status={p.value === 'ready' ? 'completed' : p.value === 'failed' ? 'failed' : 'pending'} /> },
    dateColumn({ field: 'createdAt', headerName: 'Issued', width: 130 }),
    actionsColumn({ count: 2, getActions: (row) => [
      row.pdfUrl && { icon: <DownloadIcon fontSize="small" />, tip: 'Download PDF', onClick: () => window.open(row.pdfUrl, '_blank') },
      { icon: <RefreshIcon fontSize="small" />, tip: 'Regenerate PDF', onClick: () => regenerate(row) },
    ] }),
  ];

  return (
    <AdminTable rows={rows} columns={columns} loading={loading} title="Generated invoices"
      emptyTitle="No invoices yet" emptyHint="Invoices are created automatically when a pooja or order is paid" />
  );
}
