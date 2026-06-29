import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Tabs, Tab, Stack, Typography, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid, Chip, Divider,
  ToggleButton, ToggleButtonGroup, CircularProgress,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIcon from '@mui/icons-material/DragIndicator';
import PlayIcon from '@mui/icons-material/PlayCircle';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';
import ImageCropper from '../components/ImageCropper';
import ThemeStudio from '../components/ThemeStudio';
import SplashStudio from '../components/SplashStudio';

const SECTION_LABELS = {
  banners: { label: 'Promo banners', hint: 'Auto-rotating carousel at the top of Home' },
  videos: { label: 'Astrology Videos', hint: 'Horizontal YouTube video row' },
  lessons: { label: 'Astrology Lessons', hint: 'Horizontal lessons row' },
  pooja: { label: 'Book a Pooja banner', hint: 'CTA banner that opens the pooja listing' },
  nearby: { label: 'Nearby Astrologers', hint: 'Location-based astrologer row' },
  featured: { label: 'Featured Astrologers', hint: 'Curated featured astrologer row' },
};

export default function AppConfiguration() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <PageHeader title="App Configuration" subtitle="Control what shows on the app's Home — banners, videos, lessons, and section visibility" />
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 2, borderBottom: `1px solid ${b.border}` }}>
          <Tab label="Promo Banners" />
          <Tab label="Videos & Lessons" />
          <Tab label="Section Visibility" />
          <Tab label="Theme Studio" />
          <Tab label="Splash Screen" />
        </Tabs>
        <CardContent>
          {tab === 0 && <BannersTab />}
          {tab === 1 && <VideosTab />}
          {tab === 2 && <SectionsTab />}
          {tab === 3 && <ThemeStudio />}
          {tab === 4 && <SplashStudio />}
        </CardContent>
      </Card>
    </Box>
  );
}

/* ─────────────────────────── Banners ─────────────────────────── */

// Where a banner can send the user when tapped. These values map 1:1 to the
// user app's DeepLink router (deep_link.dart), so a banner's `link` is just a
// target slug the app already knows how to open. Keep this list in sync with
// the app's _targetForPath() switch. '' = no target (banner is not tappable).
const TAP_TARGETS = [
  { value: '', label: 'None (not tappable)' },
  { value: 'pooja', label: 'Book a Pooja (list)' },
  { value: '__pooja__', label: 'A specific pooja…' },
  { value: '__category__', label: 'A pooja category…' },
  { value: 'astrologers', label: 'Astrologers list' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'profile', label: 'My Profile' },
  { value: 'settings', label: 'Notification settings' },
  { value: '__url__', label: 'External URL…' },
];
// Static (no secondary picker) target slugs.
const KNOWN_TARGETS = new Set(['pooja', 'astrologers', 'wallet', 'notifications', 'profile', 'settings']);
// Stored link → which dropdown option it represents.
//   pooja/<id>          → a specific pooja
//   pooja?category=<id> → a pooja category
//   <known slug>        → that static target
//   http(s)://…         → external URL
const targetKindOf = (link) => {
  if (!link) return '';
  if (/^pooja\/[a-f0-9]{24}$/i.test(link)) return '__pooja__';
  if (/^pooja\?category=/i.test(link)) return '__category__';
  if (KNOWN_TARGETS.has(link)) return link;
  return '__url__';
};
// Extract the id from a pooja/category link (for prefilling the secondary picker).
const poojaIdOf = (link) => (/^pooja\/([a-f0-9]{24})$/i.exec(link || '')?.[1]) || '';
const categoryIdOf = (link) => (/^pooja\?category=([a-f0-9]{24})$/i.exec(link || '')?.[1]) || '';
// Stored link → a human label for the list preview.
const targetLabelOf = (link) => {
  if (!link) return '';
  if (poojaIdOf(link)) return 'Specific pooja';
  if (categoryIdOf(link)) return 'Pooja category';
  const known = TAP_TARGETS.find((t) => t.value === link);
  if (known) return known.label;
  return /^https?:\/\//i.test(link) ? 'External link' : link;
};

function BannersTab() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [placement, setPlacement] = useState('promo'); // promo carousel | pooja banner
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // {} for new, row for edit
  // Banners are image-only (no title/subtitle). `targetKind` drives the tap-target
  // dropdown; `link` is the actual stored value. For a known internal target
  // they're equal; for '__url__' the link is the typed URL.
  const [form, setForm] = useState({ image: '', link: '', targetKind: '', poojaId: '', categoryId: '', sortOrder: 0, isActive: true });
  // Options for the "specific pooja" / "category" tap-target pickers.
  const [poojas, setPoojas] = useState([]);
  const [poojaCats, setPoojaCats] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listBanners({ placement }); setRows(data.data); }
    catch { toast.error('Failed to load banners'); } finally { setLoading(false); }
  }, [placement]);
  useEffect(() => { load(); }, [load]);
  // Fetch pooja + category options once (for the tap-target pickers).
  useEffect(() => {
    AdminAPI.listPoojaTypes().then(({ data }) => setPoojas(data.data || [])).catch(() => {});
    AdminAPI.listPoojaCategories().then(({ data }) => setPoojaCats((data.data || []).filter((c) => c.isActive))).catch(() => {});
  }, []);

  const open = (row) => {
    const link = row?.link || '';
    setForm({
      image: row?.image || '',
      link, targetKind: targetKindOf(link),
      poojaId: poojaIdOf(link), categoryId: categoryIdOf(link),
      sortOrder: row?.sortOrder ?? rows.length, isActive: row?.isActive ?? true,
    });
    setDialog(row || {});
  };

  const save = async () => {
    if (!form.image) return toast.error('Crop a banner image first');
    // Resolve the dropdown selection into the stored link.
    let link = '';
    if (form.targetKind === '__url__') {
      link = (form.link || '').trim();
      if (!/^https?:\/\/\S+/i.test(link)) return toast.error('Enter a valid http(s):// URL for the external target');
    } else if (form.targetKind === '__pooja__') {
      if (!form.poojaId) return toast.error('Pick a pooja');
      link = `pooja/${form.poojaId}`;
    } else if (form.targetKind === '__category__') {
      if (!form.categoryId) return toast.error('Pick a category');
      link = `pooja?category=${form.categoryId}`;
    } else {
      link = form.targetKind; // static slug or '' (none)
    }
    const { targetKind, poojaId, categoryId, ...rest } = form; // drop UI-only helpers
    const body = { ...rest, link, placement, sortOrder: Number(form.sortOrder || 0) };
    try {
      if (dialog._id) await AdminAPI.updateBanner(dialog._id, body);
      else await AdminAPI.createBanner(body);
      toast.success('Banner saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const remove = async (row) => {
    if (!window.confirm('Delete this banner?')) return;
    try { await AdminAPI.deleteBanner(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); }
  };
  const toggle = async (row) => {
    try { await AdminAPI.updateBanner(row._id, { isActive: !row.isActive }); load(); } catch { toast.error('Failed'); }
  };

  // ── Drag-and-drop reordering ──
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  // Drop: move the dragged row to the hovered position, optimistically update the
  // list, then persist the new order (sortOrder = 0,1,2,…) to the backend.
  const onDrop = async () => {
    const from = dragIndex, to = overIndex;
    setDragIndex(null); setOverIndex(null);
    if (from == null || to == null || from === to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRows(next.map((r, i) => ({ ...r, sortOrder: i }))); // optimistic
    try {
      await AdminAPI.reorderBanners(next.map((r) => r._id));
      toast.success('Order saved');
    } catch {
      toast.error('Reorder failed'); load(); // revert from server on failure
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Stack spacing={1}>
          <ToggleButtonGroup size="small" exclusive value={placement} onChange={(e, v) => v && setPlacement(v)}>
            <ToggleButton value="promo">Promo carousel</ToggleButton>
            <ToggleButton value="pooja">Book a Pooja banner</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" sx={{ color: b.textDim }}>
            {placement === 'promo'
              ? 'Top auto-rotating carousel on Home. 5:1 strip — cropping keeps it sharp.'
              : 'The "Book a Pooja" banner slot. Same 5:1 strip; falls back to the built-in banner if none are active.'}
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add {placement === 'pooja' ? 'pooja banner' : 'banner'}</Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
      ) : rows.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', color: b.textFaint }}>No banners yet. Add one to start the carousel.</Box>
      ) : (
        <>
          <Typography variant="caption" sx={{ color: b.textFaint, mb: 1, display: 'block' }}>
            Drag the handle to reorder — the top banner shows first in the carousel.
          </Typography>
          <Stack spacing={1.5}>
            {rows.map((r, i) => (
              <Stack key={r._id} direction="row" spacing={2} alignItems="center"
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }}
                onDrop={onDrop}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                sx={{
                  p: 1.5, borderRadius: 2, border: `1px solid ${overIndex === i && dragIndex !== i ? b.blue : b.border}`,
                  background: alpha(b.surface2, 0.5), opacity: dragIndex === i ? 0.4 : (r.isActive ? 1 : 0.55),
                  transition: 'border-color .12s, opacity .12s',
                }}>
                <DragIcon sx={{ color: b.textFaint, cursor: 'grab' }} />
                <Chip size="small" label={`#${i + 1}`} sx={{ background: alpha(b.blue, 0.14), color: b.blue, fontWeight: 700, flexShrink: 0 }} />
                {/* Banner is image-only; show a larger preview + its tap target. */}
                <Box sx={{ width: 220, height: 44, borderRadius: 1, background: `url(${r.image}) center/cover`, border: `1px solid ${b.border}`, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap variant="caption" sx={{ color: b.textDim }}>
                    {r.link ? `→ ${targetLabelOf(r.link)}` : <span style={{ color: b.textFaint }}>No tap target</span>}
                  </Typography>
                </Box>
                <Switch checked={r.isActive} onChange={() => toggle(r)} size="small" />
                <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => open(r)} sx={{ color: b.textDim }}>Edit</Button>
                <Button size="small" startIcon={<DeleteIcon fontSize="small" />} onClick={() => remove(r)} sx={{ color: b.red }}>Delete</Button>
              </Stack>
            ))}
          </Stack>
        </>
      )}

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} {placement === 'pooja' ? 'pooja banner' : 'banner'}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          <Stack spacing={2}>
            <ImageCropper value={form.image} onChange={(url) => setForm((f) => ({ ...f, image: url }))} aspect={5} outWidth={1200} outHeight={240} label="banner" />
            <TextField
              select label="Tap target" fullWidth value={form.targetKind}
              onChange={(e) => setForm((f) => ({ ...f, targetKind: e.target.value, link: e.target.value === '__url__' ? '' : e.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText="Where the banner opens when tapped"
            >
              {TAP_TARGETS.map((t) => <MenuItem key={t.value || 'none'} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            {form.targetKind === '__url__' && (
              <TextField
                label="External URL" fullWidth value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                InputLabelProps={{ shrink: true }} placeholder="https://…"
                helperText="Opens in the device browser"
              />
            )}
            {form.targetKind === '__pooja__' && (
              <TextField
                select label="Which pooja" fullWidth value={form.poojaId}
                onChange={(e) => setForm((f) => ({ ...f, poojaId: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                helperText="Opens this pooja's detail page directly"
              >
                {poojas.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
              </TextField>
            )}
            {form.targetKind === '__category__' && (
              <TextField
                select label="Which category" fullWidth value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                helperText="Opens the pooja list filtered to this category"
              >
                {poojaCats.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
              </TextField>
            )}
            {/* Order is set by drag-and-drop in the list, not a manual number. */}
            <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />} label="Active" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog(null)} sx={{ color: b.textDim }}>Cancel</Button>
          <Button onClick={save} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ─────────────────────────── Videos & Lessons ─────────────────────────── */
function VideosTab() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [kind, setKind] = useState('video');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ title: '', youtubeUrl: '', sortOrder: 0, isActive: true });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.listVideos({ kind }); setRows(data.data); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  const open = (row) => {
    setForm({ title: row?.title || '', youtubeUrl: row?.youtubeUrl || '', sortOrder: row?.sortOrder ?? rows.length, isActive: row?.isActive ?? true });
    setDialog(row || {});
  };
  const save = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.youtubeUrl.trim()) return toast.error('YouTube URL is required');
    const body = { ...form, kind, sortOrder: Number(form.sortOrder || 0) };
    try {
      if (dialog._id) await AdminAPI.updateVideo(dialog._id, body);
      else await AdminAPI.createVideo(body);
      toast.success('Saved'); setDialog(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const remove = async (row) => { if (!window.confirm('Delete this item?')) return; try { await AdminAPI.deleteVideo(row._id); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };
  const toggle = async (row) => { try { await AdminAPI.updateVideo(row._id, { isActive: !row.isActive }); load(); } catch { toast.error('Failed'); } };

  // Live preview thumbnail for the dialog (client-side YouTube id extraction).
  const ytId = (url = '') => {
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/) || String(url).match(/^([A-Za-z0-9_-]{11})$/);
    return m ? m[1] : null;
  };
  const previewId = ytId(form.youtubeUrl);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={kind} onChange={(e, v) => v && setKind(v)}>
          <ToggleButton value="video">Videos</ToggleButton>
          <ToggleButton value="lesson">Lessons</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Add {kind}</Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
      ) : rows.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', color: b.textFaint }}>No {kind}s yet. Paste a YouTube link to add one.</Box>
      ) : (
        <Grid container spacing={2}>
          {rows.map((r) => (
            <Grid item xs={12} sm={6} md={4} key={r._id}>
              <Box sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${b.border}`, background: alpha(b.surface2, 0.5), opacity: r.isActive ? 1 : 0.55 }}>
                <Box sx={{ position: 'relative', aspectRatio: '16 / 9', background: `url(${r.thumbnail}) center/cover`, backgroundColor: '#000' }}>
                  <PlayIcon sx={{ position: 'absolute', inset: 0, m: 'auto', fontSize: 44, color: alpha('#fff', 0.92), filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />
                  <Chip size="small" label={`#${r.sortOrder}`} sx={{ position: 'absolute', top: 8, left: 8, background: alpha('#000', 0.6), color: '#fff', fontWeight: 700, height: 20 }} />
                </Box>
                <Box sx={{ p: 1.25 }}>
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: 13 }}>{r.title}</Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Switch checked={r.isActive} onChange={() => toggle(r)} size="small" />
                    <Box>
                      <Button size="small" onClick={() => open(r)} sx={{ color: b.textDim, minWidth: 0 }}><EditIcon fontSize="small" /></Button>
                      <Button size="small" onClick={() => remove(r)} sx={{ color: b.red, minWidth: 0 }}><DeleteIcon fontSize="small" /></Button>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{dialog?._id ? 'Edit' : 'Add'} {kind}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          <Stack spacing={2}>
            <TextField label="Title" fullWidth value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="YouTube URL" fullWidth value={form.youtubeUrl} onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))} InputLabelProps={{ shrink: true }} placeholder="https://youtube.com/watch?v=…" helperText="Thumbnail is pulled from YouTube automatically" />
            {previewId && (
              <Box sx={{ borderRadius: 1.5, overflow: 'hidden', border: `1px solid ${b.border}`, aspectRatio: '16 / 9', background: `url(https://img.youtube.com/vi/${previewId}/hqdefault.jpg) center/cover`, backgroundColor: '#000', position: 'relative' }}>
                <PlayIcon sx={{ position: 'absolute', inset: 0, m: 'auto', fontSize: 44, color: alpha('#fff', 0.92) }} />
              </Box>
            )}
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Sort order" type="number" fullWidth value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ min: 0 }} /></Grid>
              <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />} label="Active" />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog(null)} sx={{ color: b.textDim }}>Cancel</Button>
          <Button onClick={save} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ─────────────────────────── Section toggles ─────────────────────────── */
function SectionsTab() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [sections, setSections] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { AdminAPI.getAppConfig().then((r) => setSections(r.data.data.sections)).catch(() => toast.error('Failed to load')); }, []);

  const flip = async (key) => {
    const next = { ...sections, [key]: !sections[key] };
    setSections(next); setSaving(true);
    try { await AdminAPI.updateAppConfig({ sections: { [key]: next[key] } }); }
    catch { toast.error('Failed to save'); setSections((s) => ({ ...s, [key]: !next[key] })); }
    finally { setSaving(false); }
  };

  if (!sections) return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>;

  return (
    <Box>
      <Typography variant="body2" sx={{ color: b.textDim, mb: 2 }}>
        Turn a section off to hide it everywhere in the app instantly. {saving && <Box component="span" sx={{ color: b.amber }}>· saving…</Box>}
      </Typography>
      <Stack divider={<Divider sx={{ borderColor: b.borderSoft }} />}>
        {Object.keys(SECTION_LABELS).map((key) => (
          <Stack key={key} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{SECTION_LABELS[key].label}</Typography>
              <Typography variant="caption" sx={{ color: b.textDim }}>{SECTION_LABELS[key].hint}</Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Chip size="small" label={sections[key] ? 'Visible' : 'Hidden'}
                sx={{ background: alpha(sections[key] ? b.green : b.textFaint, 0.16), color: sections[key] ? b.green : b.textFaint, fontWeight: 700 }} />
              <Switch checked={!!sections[key]} onChange={() => flip(key)} />
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
