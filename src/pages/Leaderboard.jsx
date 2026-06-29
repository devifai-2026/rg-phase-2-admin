import { useEffect, useState, useCallback } from 'react';
import { Box, Card, CardContent, Stack, Avatar, Typography, ToggleButton, ToggleButtonGroup, Rating } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader, rupees } from '../components/common';
import EmptyState from '../components/EmptyState';

const medal = (rank) => ({ 1: '#E0A93B', 2: '#A8AEBE', 3: '#C77B4E' }[rank]);

export default function Leaderboard() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [rows, setRows] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await AdminAPI.leaderboard(days); setRows(data.data); }
    catch { toast.error('Failed to load leaderboard'); } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <PageHeader title="Astrologer Leaderboard" subtitle="Top earners and most active astrologers"
        action={
          <ToggleButtonGroup size="small" exclusive value={days} onChange={(e, v) => v && setDays(v)}>
            <ToggleButton value={7}>7d</ToggleButton>
            <ToggleButton value={30}>30d</ToggleButton>
            <ToggleButton value={90}>90d</ToggleButton>
          </ToggleButtonGroup>
        } />
      <Card>
        <CardContent>
          {loading ? <EmptyState title="Loading…" /> : rows.length === 0 ? <EmptyState title="No completed sessions yet" hint="Rankings appear once consultations complete" /> : (
            <Stack divider={<Box sx={{ height: 1, background: b.borderSoft }} />}>
              {rows.map((a) => (
                <Stack key={a.id} direction="row" alignItems="center" spacing={2} sx={{ py: 1.25 }}>
                  <Box sx={{ width: 28, textAlign: 'center', fontWeight: 800, color: medal(a.rank) || b.textFaint, fontSize: a.rank <= 3 ? 16 : 13 }}>{a.rank}</Box>
                  <Avatar src={a.avatar} sx={{ width: 38, height: 38, background: b.surface2, border: a.rank <= 3 ? `2px solid ${medal(a.rank)}` : 'none' }}>{a.name[0]}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{a.name}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Rating value={a.rating || 0} precision={0.5} size="small" readOnly />
                      <Typography variant="caption" sx={{ color: b.textDim }}>{a.sessions} sessions · {a.minutes} min</Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: b.red }}>{rupees(a.earnings)}</Typography>
                    <Typography variant="caption" sx={{ color: b.textFaint }}>gross {rupees(a.gross)}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
