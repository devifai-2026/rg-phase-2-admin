import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, ToggleButtonGroup, ToggleButton,
  Chip, Grid, LinearProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { SuperAdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';
import { API_ORIGIN } from '../api/config';

const DEVICES = ['', 'desktop', 'mobile', 'tablet'];
const RANGES = [{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }];

// The landing page is served by the BACKEND, not the admin SPA. In dev the
// admin runs on :5173 and the backend on :5050, so point the iframe at the
// backend origin (override with VITE_LANDING_URL). In prod, if the backend
// serves the admin too, same-origin '' works.
const LANDING_URL =
  import.meta.env.VITE_LANDING_URL ||
  API_ORIGIN ||
  (import.meta.env.DEV ? 'http://localhost:5050' : '');

// Render click points (0–100 % coords) as a blue→red density heatmap on a
// canvas sized to the full preview (w × h). x maps across width, y across the
// full document height — matching how clicks are stored.
function paintHeatmap(canvas, points, w, h) {
  const ctx = canvas.getContext('2d');
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  if (!points || !points.length) return;

  const max = points.reduce((m, p) => Math.max(m, p.value), 1);
  // blob radius scales a little with canvas width so it reads on big screens
  const R = Math.max(28, Math.round(w * 0.035));

  // 1. accumulate greyscale-alpha blobs (additive via 'lighter')
  ctx.globalCompositeOperation = 'lighter';
  points.forEach((p) => {
    const x = (p.x / 100) * w;
    const y = (p.y / 100) * h;
    const intensity = 0.35 + (p.value / max) * 0.55; // 0.35–0.9
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(0,0,0,${intensity})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';

  // 2. recolor accumulated alpha → blue→cyan→green→yellow→red ramp
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const ramp = (a) => {
    if (a < 0.25) return [0, Math.round((a / 0.25) * 200), 255];
    if (a < 0.5) return [0, 220, Math.round(255 - ((a - 0.25) / 0.25) * 200)];
    if (a < 0.75) return [Math.round(((a - 0.5) / 0.25) * 255), 230, 0];
    return [255, Math.round(200 - ((a - 0.75) / 0.25) * 180), 0];
  };
  for (let i = 0; i < d.length; i += 4) {
    let a = d[i + 3] / 255;
    if (a > 0.03) {
      a = Math.min(1, a);
      const [r, g, bl] = ramp(a);
      d[i] = r; d[i + 1] = g; d[i + 2] = bl;
      d[i + 3] = Math.round(Math.min(1, a * 1.6) * 235);
    } else {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export default function Heatmap() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [device, setDevice] = useState('');
  const [range, setRange] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageH, setStageH] = useState(1600); // full landing-page height (px)
  const stageRef = useRef(null);
  const canvasRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await SuperAdminAPI.heatmap({
        days: RANGES[range].days,
        device: device || undefined,
        path: '/',
      });
      setData(res.data);
    } catch {
      toast.error('Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  }, [device, range]);
  useEffect(() => { load(); }, [load]);

  const repaint = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas || !data) return;
    paintHeatmap(canvas, data.points || [], stage.clientWidth, stage.clientHeight);
  }, [data]);

  // repaint when data, stage height, or window size changes
  useEffect(() => { repaint(); }, [repaint, stageH]);
  useEffect(() => {
    const onResize = () => repaint();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [repaint]);

  // the landing page posts its scrollHeight so we size the stage to the
  // full page; fall back to a tall default if the message never arrives.
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data && e.data.type === 'rg-page-height' && typeof e.data.height === 'number') {
        setStageH(Math.max(800, Math.min(e.data.height, 12000)));
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const byLabel = data?.byLabel || [];
  const byDevice = data?.byDevice || [];

  return (
    <>
      <PageHeader
        title="Click Heatmap"
        subtitle="Where visitors click on the landing page"
        action={
          <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v) => v != null && setRange(v)}>
            {RANGES.map((r, i) => <ToggleButton key={r.label} value={i}>{r.label}</ToggleButton>)}
          </ToggleButtonGroup>
        }
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="body2" color="text.secondary">Device:</Typography>
        {DEVICES.map((d) => (
          <Chip
            key={d || 'all'} label={d ? d[0].toUpperCase() + d.slice(1) : 'All'}
            onClick={() => setDevice(d)} variant={device === d ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        ))}
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {data?.total ? `${data.total.toLocaleString('en-IN')} clicks` : ''}
        </Typography>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Landing page overlay — scroll to see the whole page</Typography>
              {/* fixed-height scroll viewport; the inner stage is the full page height */}
              <Box
                sx={{
                  position: 'relative', width: '100%', height: 620, borderRadius: 2,
                  overflowY: 'auto', overflowX: 'hidden', border: `1px solid ${palette.divider}`, background: '#0B0B0C',
                }}
              >
                <Box ref={stageRef} sx={{ position: 'relative', width: '100%', height: stageH }}>
                  <iframe
                    title="landing"
                    src={`${LANDING_URL}/?heatmap=1`}
                    onLoad={repaint}
                    scrolling="no"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                  />
                </Box>
                {!data?.points?.length && !loading && (
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 620, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.5)', pointerEvents: 'none' }}>
                    No clicks recorded in this range
                  </Box>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Heat shows click density (blue = low, red = high). The overlay maps to the top of the page.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Most-clicked elements</Typography>
              <Stack spacing={1}>
                {byLabel.length ? byLabel.map((l, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between">
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{l.label || '(unlabelled)'}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: b.red }}>{l.value}</Typography>
                  </Stack>
                )) : <Typography variant="body2" color="text.disabled">No data</Typography>}
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>By device</Typography>
              <Stack spacing={1}>
                {byDevice.length ? byDevice.map((d, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between">
                    <Typography variant="body2">{d.name}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.value}</Typography>
                  </Stack>
                )) : <Typography variant="body2" color="text.disabled">No data</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
