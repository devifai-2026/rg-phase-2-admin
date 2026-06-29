import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, Stack, Typography, Switch, Button, Chip, CircularProgress,
  ToggleButton, ToggleButtonGroup, Divider, IconButton, Tooltip, Tabs, Tab,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CampaignIcon from '@mui/icons-material/Campaign';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

/**
 * AI Marketing Agent — toggle + frequency, generate engagement push lines,
 * review (Save/Reject) the fresh batch, and browse the active pool. The cron
 * broadcasts one random saved line per audience each cycle.
 */
export default function Marketing() {
  const { palette } = useTheme();
  const b = palette.brand;

  const [cfg, setCfg] = useState(null);
  const [pool, setPool] = useState([]);
  const [pending, setPending] = useState([]); // freshly generated, awaiting review
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [tab, setTab] = useState(0);
  const [keep, setKeep] = useState({}); // id → bool (Save vs Reject in the review)
  const [newTime, setNewTime] = useState('09:00'); // for the fixed-times picker

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([AdminAPI.getMarketingConfig(), AdminAPI.listMarketing({ status: 'active' })]);
      setCfg(c.data.data);
      setPool(p.data.data?.items || []);
    } catch { toast.error('Failed to load marketing'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (body) => {
    try {
      const { data } = await AdminAPI.updateMarketingConfig(body);
      setCfg((c) => ({ ...c, ...data.data }));
    } catch { toast.error('Could not save'); }
  };

  // ── Fixed-times editing (add/remove daily times) ──
  const addTime = () => {
    if (!/^\d{2}:\d{2}$/.test(newTime)) { toast.error('Pick a valid time'); return; }
    const cur = cfg.fixedTimes || [];
    if (cur.includes(newTime)) { toast('Already added'); return; }
    patch({ fixedTimes: [...cur, newTime].sort() });
  };
  const removeTime = (t) => patch({ fixedTimes: (cfg.fixedTimes || []).filter((x) => x !== t) });
  // "13:00" → "1pm", "09:30" → "9:30am"
  const fmtTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ap = h < 12 ? 'am' : 'pm';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${h12}${ap}` : `${h12}:${String(m).padStart(2, '0')}${ap}`;
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await AdminAPI.generateMarketing(30);
      const items = data.data?.items || [];
      setPending(items);
      setKeep(Object.fromEntries(items.map((i) => [i._id, true]))); // default: keep all
      toast.success(`Generated ${items.length} — review below`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Generation failed (is the LLM configured?)');
    } finally { setGenerating(false); }
  };

  const submitReview = async () => {
    setSavingReview(true);
    const saveIds = pending.filter((i) => keep[i._id]).map((i) => i._id);
    const rejectIds = pending.filter((i) => !keep[i._id]).map((i) => i._id);
    try {
      await AdminAPI.reviewMarketing({ saveIds, rejectIds });
      toast.success(`Saved ${saveIds.length}, rejected ${rejectIds.length}`);
      setPending([]); setKeep({});
      load();
    } catch { toast.error('Could not save review'); }
    finally { setSavingReview(false); }
  };

  const runNow = async () => {
    try { const { data } = await AdminAPI.runMarketingNow(); toast.success(`Sent ${data.data?.sent ?? 0} broadcast(s)`); }
    catch { toast.error('Send failed'); }
  };

  if (loading || !cfg) {
    return <Box><PageHeader title="AI Marketing" subtitle="Engagement push notifications" /><Box sx={{ display: 'grid', placeItems: 'center', height: 240 }}><CircularProgress /></Box></Box>;
  }

  const langChip = (l) => <Chip size="small" label={l} sx={{ bgcolor: alpha(b.gold, 0.14), color: b.gold, height: 20 }} />;
  const audChip = (a) => <Chip size="small" label={a === 'users' ? 'Seekers' : 'Astrologers'} sx={{ bgcolor: alpha(a === 'users' ? b.blue : b.violet, 0.16), color: a === 'users' ? b.blue : b.violet, fontWeight: 700, height: 20 }} />;

  return (
    <Box>
      <PageHeader title="AI Marketing" subtitle="AI-generated engagement push notifications — toggle, schedule, review" />

      {/* ── Config card ── */}
      <Card sx={{ p: 3, mb: 2, maxWidth: 760 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, background: alpha(b.violet, 0.16), display: 'grid', placeItems: 'center' }}>
            <CampaignIcon sx={{ color: b.violet }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>Marketing agent</Typography>
            <Typography variant="caption" sx={{ color: b.textDim }}>
              Active pool: {cfg.pool?.activeUsers || 0} seeker · {cfg.pool?.activeAstro || 0} astrologer lines
              {cfg.lastRunAt ? ` · last sent ${new Date(cfg.lastRunAt).toLocaleString('en-IN')}` : ''}
            </Typography>
          </Box>
          <Switch checked={!!cfg.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
        </Stack>

        <Typography variant="overline" sx={{ color: b.textDim, fontWeight: 700 }}>Frequency</Typography>
        <Box sx={{ mt: 1 }}>
          <ToggleButtonGroup exclusive size="small" value={cfg.frequency} onChange={(e, v) => v && patch({ frequency: v })}>
            <ToggleButton value="every5">Every 5 min</ToggleButton>
            <ToggleButton value="every10">Every 10 min</ToggleButton>
            <ToggleButton value="fixed">Fixed times</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* When "Fixed", the admin can add/remove any number of daily times. */}
        {cfg.frequency === 'fixed' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: b.textDim, display: 'block', mb: 1 }}>
              Fires every day at each of these times (server time). Add as many as you like.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              {(cfg.fixedTimes || []).slice().sort().map((t) => (
                <Chip key={t} label={fmtTime(t)} onDelete={() => removeTime(t)}
                  sx={{ bgcolor: alpha(b.violet, 0.16), color: b.violet, fontWeight: 700 }} />
              ))}
              {(cfg.fixedTimes || []).length === 0 && (
                <Typography variant="caption" sx={{ color: b.amber }}>No times set — add at least one.</Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                style={{ background: b.surface2, color: b.text, border: `1px solid ${b.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 14 }}
              />
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addTime}>Add time</Button>
            </Stack>
          </Box>
        )}

        {!cfg.enabled && <Typography variant="caption" sx={{ color: b.amber, display: 'block', mt: 1.5 }}>Agent is OFF — turn the switch on to start sending.</Typography>}

        <Divider sx={{ my: 2.5, borderColor: b.borderSoft }} />
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button variant="contained" startIcon={generating ? <CircularProgress size={15} color="inherit" /> : <AutoAwesomeIcon />} disabled={generating} onClick={generate}>
            {generating ? 'Generating…' : 'Generate 30 new lines'}
          </Button>
          <Button variant="outlined" startIcon={<SendIcon />} onClick={runNow} disabled={(cfg.pool?.activeUsers || 0) + (cfg.pool?.activeAstro || 0) === 0}>
            Send one cycle now (test)
          </Button>
        </Stack>
      </Card>

      {/* ── Review of freshly generated batch ── */}
      {pending.length > 0 && (
        <Card sx={{ p: 2.5, mb: 2 }}>
          <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, flex: 1 }}>Review {pending.length} generated lines</Typography>
            <Button variant="contained" disabled={savingReview} onClick={submitReview}
              startIcon={savingReview ? <CircularProgress size={15} color="inherit" /> : <CheckIcon />}>
              Save kept · reject rest
            </Button>
          </Stack>
          <Typography variant="caption" sx={{ color: b.textDim, mb: 1.5, display: 'block' }}>
            Toggle each one: Keep adds it to the rotation, Reject discards it. Kept lines become the style reference for the next generation.
          </Typography>
          <Stack spacing={1}>
            {pending.map((it) => {
              const kept = keep[it._id];
              return (
                <Box key={it._id} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${kept ? alpha(b.green, 0.5) : b.borderSoft}`, background: kept ? alpha(b.green, 0.06) : b.surface2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    {audChip(it.audience)} {langChip(it.lang)}
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Keep"><IconButton size="small" onClick={() => setKeep((k) => ({ ...k, [it._id]: true }))} sx={{ color: kept ? b.green : b.textDim }}><CheckIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Reject"><IconButton size="small" onClick={() => setKeep((k) => ({ ...k, [it._id]: false }))} sx={{ color: !kept ? b.red : b.textDim }}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                  <Typography sx={{ fontWeight: 700, color: b.text }}>{it.title}</Typography>
                  <Typography variant="body2" sx={{ color: b.textDim }}>{it.body}</Typography>
                </Box>
              );
            })}
          </Stack>
        </Card>
      )}

      {/* ── Active pool ── */}
      <Card sx={{ mb: 1 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label={`Seekers (${pool.filter((p) => p.audience === 'users').length})`} />
          <Tab label={`Astrologers (${pool.filter((p) => p.audience === 'astrologers').length})`} />
        </Tabs>
      </Card>
      <Stack spacing={1}>
        {pool.filter((p) => p.audience === (tab === 0 ? 'users' : 'astrologers')).map((it) => (
          <Box key={it._id} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${b.borderSoft}`, background: b.surface }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              {langChip(it.lang)}
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" sx={{ color: b.textDim }}>sent {it.sentCount || 0}×</Typography>
            </Stack>
            <Typography sx={{ fontWeight: 700, color: b.text }}>{it.title}</Typography>
            <Typography variant="body2" sx={{ color: b.textDim }}>{it.body}</Typography>
          </Box>
        ))}
        {pool.filter((p) => p.audience === (tab === 0 ? 'users' : 'astrologers')).length === 0 && (
          <Typography sx={{ color: b.textDim, p: 2 }}>No active lines yet — generate a batch above.</Typography>
        )}
      </Stack>
    </Box>
  );
}
