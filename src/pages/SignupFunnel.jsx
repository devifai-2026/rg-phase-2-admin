import { useEffect, useState, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, Stack, ToggleButtonGroup, ToggleButton, LinearProgress,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { SuperAdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

const FORMS = [
  { key: 'astrologer_apply', label: 'Astrologer apply' },
  { key: 'contact', label: 'Contact us' },
];
const RANGES = [{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }];

export default function SignupFunnel() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [form, setForm] = useState('astrologer_apply');
  const [range, setRange] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await SuperAdminAPI.signupFunnel({ form, days: RANGES[range].days });
      setData(res.data);
    } catch {
      toast.error('Failed to load funnel');
    } finally {
      setLoading(false);
    }
  }, [form, range]);
  useEffect(() => { load(); }, [load]);

  const steps = data?.steps || [];

  return (
    <>
      <PageHeader
        title="Form Funnel"
        subtitle="Where visitors drop off in each landing-page form"
        action={
          <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v) => v != null && setRange(v)}>
            {RANGES.map((r, i) => <ToggleButton key={r.label} value={i}>{r.label}</ToggleButton>)}
          </ToggleButtonGroup>
        }
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {FORMS.map((f) => (
          <ToggleButton
            key={f.key} value={f.key} selected={form === f.key} size="small"
            onChange={() => setForm(f.key)}
          >
            {f.label}
          </ToggleButton>
        ))}
      </Stack>

      <Card>
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          {!steps.length && !loading && (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.disabled' }}>No events recorded yet</Box>
          )}
          <Stack spacing={2}>
            {steps.map((st, i) => {
              const prev = i > 0 ? steps[i - 1].count : st.count;
              const stepDrop = prev ? Math.round((1 - st.count / prev) * 100) : 0;
              return (
                <Box key={st.step}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {i + 1}. {st.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {st.count} · {st.pctOfTop}% of top
                      {i > 0 && stepDrop > 0 && (
                        <span style={{ color: b.red, marginLeft: 8 }}>−{stepDrop}%</span>
                      )}
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 34, borderRadius: 1.5, overflow: 'hidden', background: alpha(palette.text.primary, 0.06) }}>
                    <Box sx={{
                      height: '100%', width: `${st.pctOfTop}%`, minWidth: st.count ? 6 : 0,
                      background: `linear-gradient(90deg, ${b.red}, ${alpha(b.red, 0.6)})`,
                      transition: 'width .6s ease',
                    }} />
                  </Box>
                </Box>
              );
            })}
          </Stack>
          {data?.errors > 0 && (
            <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
              {data.errors} submission error(s) in this period
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
}
