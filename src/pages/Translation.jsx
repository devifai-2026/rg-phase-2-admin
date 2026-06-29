import { useEffect, useState, useCallback } from 'react';
import { Box, Card, Stack, Typography, Button, Chip, CircularProgress, Alert, Grid,
  Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import TranslateIcon from '@mui/icons-material/Translate';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

/**
 * Translation — run a full GCP translation pass over all dynamic content
 * (astrologer bios, product + pooja names/descriptions) into every supported
 * language, and report exactly how many lines + characters were translated.
 * Reads are no-fallback: a user always sees content in their chosen language
 * (stored translation, else translate-on-read + cache).
 */
export default function Translation() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [starting, setStarting] = useState(false);

  // The run is server-tracked: status.run = { running, startedAt, lastResult, error }.
  // So "running" survives navigating away and back, and we just reflect the server.
  const running = !!status?.run?.running || starting;
  const report = status?.run?.lastResult || null;

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([AdminAPI.translationStatus(), AdminAPI.translationRuns(20)]);
      setStatus(s.data.data);
      setRuns(r.data.data || []);
    } catch { /* keep last known status; polling will recover */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Poll while a run is in progress so the page updates live (and stops when done).
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [running, load]);

  const run = async () => {
    setStarting(true);
    try {
      const { data } = await AdminAPI.runTranslation();
      if (data.data?.configured === false) toast.error('GCP Translate not configured');
      else if (data.data?.alreadyRunning) toast('A translation run is already in progress');
      else toast.success('Translation started — running in the background');
      await load();
    } catch (e) { toast.error(e.response?.data?.message || 'Translation run failed'); }
    finally { setStarting(false); }
  };

  const stat = (label, value, color) => (
    <Card sx={{ p: 2, textAlign: 'center', border: `1px solid ${b.border}` }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: color || b.text }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: b.textDim }}>{label}</Typography>
    </Card>
  );

  return (
    <Box>
      <PageHeader title="Translation" subtitle="Translate all dynamic content into every language (GCP) — no English fallback" />

      <Card sx={{ p: 3, mb: 2, maxWidth: 760 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, background: alpha(b.blue, 0.16), display: 'grid', placeItems: 'center' }}>
            <TranslateIcon sx={{ color: b.blue }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>Full translation pass</Typography>
            <Typography variant="caption" sx={{ color: b.textDim }}>
              Astrologer bios · product & pooja names/descriptions → all languages
            </Typography>
          </Box>
          {status && (
            <Chip size="small" label={status.configured ? 'GCP ready' : 'GCP not configured'}
              sx={{ fontWeight: 700, background: alpha(status.configured ? b.green : b.amber, 0.16), color: status.configured ? b.green : b.amber }} />
          )}
        </Stack>

        {status && !status.configured && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            GCP Cloud Translation isn't configured (needs GCS project + service-account key). Set it up to run translations.
          </Alert>
        )}

        {status && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Languages: ${(status.languages || []).join(', ')}`} sx={{ bgcolor: alpha(b.blue, 0.12), color: b.blue }} />
            <Chip size="small" label={`Cached translations: ${status.cachedTranslations || 0}`} sx={{ bgcolor: alpha(b.gold, 0.12), color: b.gold }} />
          </Stack>
        )}

        {running && (
          <Alert icon={<CircularProgress size={16} />} severity="info" sx={{ mb: 2 }}>
            Translation is running in the background… this page will update when it finishes.
            You can navigate away — it keeps running.
          </Alert>
        )}

        {status?.run?.error && !running && (
          <Alert severity="error" sx={{ mb: 2 }}>Last run failed: {status.run.error}</Alert>
        )}

        <Button variant="contained" size="large" disabled={running || (status && !status.configured)}
          startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
          onClick={run}>
          {running ? 'Translating… (running in background)' : 'Run translation'}
        </Button>
      </Card>

      {report && report.configured !== false && (
        <Card sx={{ p: 3, maxWidth: 760 }}>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 800 }}>Last run</Typography>
            {status?.run?.finishedAt && (
              <Typography variant="caption" sx={{ color: b.textDim }}>
                Finished {new Date(status.run.finishedAt).toLocaleString('en-IN')}
              </Typography>
            )}
          </Stack>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>{stat('Newly translated', (report.lines || 0).toLocaleString('en-IN'), b.green)}</Grid>
            <Grid item xs={6} sm={3}>{stat('Characters', (report.characters || 0).toLocaleString('en-IN'), b.blue)}</Grid>
            <Grid item xs={6} sm={3}>{stat('Already translated', (report.alreadyDone || 0).toLocaleString('en-IN'), b.gold)}</Grid>
            <Grid item xs={6} sm={3}>{stat('Total fields', (report.totalPairs || 0).toLocaleString('en-IN'), b.violet)}</Grid>
          </Grid>
          {report.byModel && Object.keys(report.byModel).length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {Object.entries(report.byModel).map(([k, v]) => (
                <Chip key={k} size="small" label={`${k}: ${v}`} sx={{ bgcolor: alpha(b.violet, 0.12), color: b.violet }} />
              ))}
            </Stack>
          )}
          {report.lines === 0 && (
            <Typography variant="body2" sx={{ color: b.textDim, mt: 1 }}>
              Nothing new to translate — all {(report.totalPairs || 0).toLocaleString('en-IN')} translatable fields are already up to date
              ({(report.alreadyDone || 0).toLocaleString('en-IN')} already translated{report.unchanged ? `, ${report.unchanged} identical across languages (e.g. names/numbers)` : ''}).
            </Typography>
          )}
        </Card>
      )}

      {/* Run history — when it last ran + how many lines/characters were translated */}
      <Card sx={{ p: 3, mt: 2, maxWidth: 1000 }}>
        <Typography sx={{ fontWeight: 800, mb: 2 }}>Run history</Typography>
        {runs.length === 0 ? (
          <Typography variant="body2" sx={{ color: b.textDim }}>No translation runs yet.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ '& td, & th': { borderColor: b.borderSoft } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: b.textDim, fontWeight: 700 }}>When</TableCell>
                  <TableCell sx={{ color: b.textDim, fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ color: b.textDim, fontWeight: 700 }}>New</TableCell>
                  <TableCell align="right" sx={{ color: b.textDim, fontWeight: 700 }}>Characters</TableCell>
                  <TableCell align="right" sx={{ color: b.textDim, fontWeight: 700 }}>Already done</TableCell>
                  <TableCell align="right" sx={{ color: b.textDim, fontWeight: 700 }}>Total fields</TableCell>
                  <TableCell sx={{ color: b.textDim, fontWeight: 700 }}>Breakdown</TableCell>
                  <TableCell align="right" sx={{ color: b.textDim, fontWeight: 700 }}>Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((r) => {
                  const ok = r.status === 'completed';
                  const secs = r.durationMs ? Math.max(1, Math.round(r.durationMs / 1000)) : 0;
                  return (
                    <TableRow key={r._id}>
                      <TableCell sx={{ color: b.text, whiteSpace: 'nowrap' }}>
                        {new Date(r.finishedAt || r.startedAt || r.createdAt).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={r.status}
                          sx={{ fontWeight: 700, textTransform: 'capitalize',
                            background: alpha(ok ? b.green : b.red, 0.16), color: ok ? b.green : b.red }} />
                      </TableCell>
                      <TableCell align="right" sx={{ color: r.lines ? b.green : b.textDim, fontWeight: 700 }}>{(r.lines || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ color: b.text }}>{(r.characters || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ color: b.textDim }}>{(r.alreadyDone || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ color: b.textDim }}>{(r.totalPairs || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell sx={{ color: b.textDim, fontSize: 12 }}>
                        {r.byModel && Object.keys(r.byModel).length
                          ? Object.entries(r.byModel).map(([k, v]) => `${k}: ${v}`).join(' · ')
                          : (r.error ? r.error : '—')}
                      </TableCell>
                      <TableCell align="right" sx={{ color: b.textDim, whiteSpace: 'nowrap' }}>{secs ? `${secs}s` : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
    </Box>
  );
}
