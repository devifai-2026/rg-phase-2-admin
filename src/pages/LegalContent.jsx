import { useEffect, useState, useMemo } from 'react';
import { Box, Card, CardContent, Grid, Tabs, Tab, TextField, Button, Stack, Typography, Switch, FormControlLabel, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { ContentAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

// Legal docs are per-SURFACE so web, the user app, and the astrologer app can
// each show different copy. The SiteContent key is `<doc>-<surface>`, e.g.
// 'terms-user', 'privacy-astrologer', 'terms-web'.
const SURFACES = [
  { id: 'web', label: 'Website' },
  { id: 'user', label: 'User App' },
  { id: 'astrologer', label: 'Astrologer App' },
];
const DOC_TYPES = [
  { type: 'terms', label: 'Terms & Conditions' },
  { type: 'privacy', label: 'Privacy Policy' },
];
const keyFor = (type, surface) => `${type}-${surface}`;

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

export default function LegalContent() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [surface, setSurface] = useState('web'); // web | user | astrologer
  const [tab, setTab] = useState(0); // 0 = terms, 1 = privacy
  // All 6 docs keyed by `<type>-<surface>` → { title, body, isPublished }.
  const [docs, setDocs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const docType = DOC_TYPES[tab];
  const surfaceLabel = SURFACES.find((s) => s.id === surface)?.label || '';
  const currentKey = keyFor(docType.type, surface);
  const form = docs[currentKey];

  // Load all surface×type docs (best-effort; a missing doc starts blank).
  useEffect(() => {
    let alive = true;
    (async () => {
      const next = {};
      for (const s of SURFACES) {
        for (const d of DOC_TYPES) {
          const key = keyFor(d.type, s.id);
          try {
            const { data } = await ContentAPI.get(key);
            const v = data.data;
            next[key] = { title: v.title || d.label, body: v.body || '', isPublished: v.isPublished !== false };
          } catch {
            next[key] = { title: d.label, body: '', isPublished: true };
          }
        }
      }
      if (alive) { setDocs(next); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const update = (patch) => setDocs((s) => ({ ...s, [currentKey]: { ...s[currentKey], ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      await ContentAPI.upsert(currentKey, { title: form.title, body: form.body, isPublished: form.isPublished });
      toast.success(`${docType.label} (${surfaceLabel}) saved`);
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  // Sanitized HTML for the live preview.
  const safeHtml = useMemo(() => DOMPurify.sanitize(form?.body || ''), [form?.body]);

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader title="Legal & Policies" subtitle="Edit Terms & Conditions and Privacy Policy — separately for Website, User App, and Astrologer App" />
      <Card sx={{ mb: 2, p: 2 }}>
        <ToggleButtonGroup exclusive size="small" value={surface}
          onChange={(e, v) => v && setSurface(v)} sx={{ mb: 1 }}>
          {SURFACES.map((s) => <ToggleButton key={s.id} value={s.id} sx={{ textTransform: 'none', px: 2 }}>{s.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          {DOC_TYPES.map((d) => <Tab key={d.type} label={d.label} />)}
        </Tabs>
      </Card>

      <Grid container spacing={2}>
        {/* Editor */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <TextField label="Title" fullWidth size="small" value={form.title}
                  onChange={(e) => update({ title: e.target.value })} />
                <FormControlLabel
                  control={<Switch checked={form.isPublished} onChange={(e) => update({ isPublished: e.target.checked })} />}
                  label={form.isPublished ? 'Published (visible in apps)' : 'Draft (hidden — apps fall back)'}
                />
                <Box sx={{
                  '& .ql-toolbar': { borderColor: b.border, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
                  '& .ql-container': { borderColor: b.border, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, minHeight: 360, fontSize: 14 },
                  '& .ql-editor': { minHeight: 360 },
                }}>
                  <ReactQuill theme="snow" value={form.body} onChange={(html) => update({ body: html })} modules={QUILL_MODULES} />
                </Box>
                <Box>
                  <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    disabled={saving} onClick={save}>{saving ? 'Saving…' : `Save ${docType.label}`}</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Live preview (phone-ish reading view) */}
        <Grid item xs={12} md={5}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: b.textDim }}>Preview</Typography>
              <Box sx={{
                p: 2, borderRadius: 3, border: `1px solid ${b.border}`, background: alpha(b.surface2, 0.5),
                maxHeight: 520, overflowY: 'auto',
              }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>{form.title}</Typography>
                {safeHtml
                  ? <Box className="legal-preview" sx={{ color: b.text, fontSize: 14, lineHeight: 1.6,
                      '& h1,& h2,& h3': { color: b.text, fontWeight: 700, mt: 2, mb: 0.5 },
                      '& a': { color: b.RED.soft }, '& ul,& ol': { pl: 3 }, '& p': { mb: 1 } }}
                      dangerouslySetInnerHTML={{ __html: safeHtml }} />
                  : <Typography variant="body2" sx={{ color: b.textFaint }}>Nothing written yet.</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
