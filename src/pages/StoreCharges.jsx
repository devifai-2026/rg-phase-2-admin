import { useEffect, useState } from 'react';
import { Stack, Switch, TextField, MenuItem, Button, Box, Typography, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { AdminAPI } from '../api/endpoints';
import { PageHeader } from '../components/common';

// The four configurable charges. Each: enabled toggle, type (flat/percent), value.
const CHARGES = [
  { key: 'delivery', title: 'Delivery fee', hint: 'Flat ₹ charged for delivery (waived above the free-delivery threshold).' },
  { key: 'shipping', title: 'Shipping charge', hint: 'Flat ₹ shipping/handling.' },
  { key: 'platform', title: 'Platform fee', hint: 'Flat ₹ platform fee per order.' },
  { key: 'gst', title: 'GST', hint: 'Tax — usually a % of the item subtotal.' },
];

export default function StoreCharges() {
  const { palette } = useTheme();
  const b = palette.brand;
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AdminAPI.getStoreCharges()
      .then((r) => setCfg(r.data.data))
      .catch(() => toast.error('Failed to load charges'));
  }, []);

  const patch = (key, field, val) => setCfg((c) => ({ ...c, [key]: { ...c[key], [field]: val } }));

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        delivery: cfg.delivery, gst: cfg.gst, shipping: cfg.shipping, platform: cfg.platform,
        freeDeliveryAbove: Number(cfg.freeDeliveryAbove || 0),
      };
      await AdminAPI.updateStoreCharges(body);
      toast.success('Charges saved');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (!cfg) return null;

  return (
    <>
      <PageHeader title="Store Charges" subtitle="Delivery, GST, shipping & platform fees applied at checkout. All default to 0 / off — turn on only what you charge." />
      <Box sx={{ maxWidth: 640 }}>
        <Stack spacing={2}>
          {CHARGES.map(({ key, title, hint }) => {
            const ch = cfg[key] || { enabled: false, type: 'flat', value: 0, label: title };
            return (
              <Box key={key} sx={{ p: 2, borderRadius: 2, background: b.surface, border: `1px solid ${b.border}` }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: b.text }}>{title}</Typography>
                    <Typography variant="caption" sx={{ color: b.textDim }}>{hint}</Typography>
                  </Box>
                  <Switch checked={!!ch.enabled} onChange={(e) => patch(key, 'enabled', e.target.checked)} />
                </Stack>
                {ch.enabled && (
                  <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                    <TextField
                      label="Type" select size="small" sx={{ width: 140 }}
                      value={ch.type || 'flat'} onChange={(e) => patch(key, 'type', e.target.value)}
                    >
                      <MenuItem value="flat">Flat ₹</MenuItem>
                      <MenuItem value="percent">Percent %</MenuItem>
                    </TextField>
                    <TextField
                      label={ch.type === 'percent' ? 'Percent (%)' : 'Amount (₹)'} type="number" size="small"
                      value={ch.value ?? 0} onChange={(e) => patch(key, 'value', Math.max(0, Number(e.target.value) || 0))}
                    />
                    <TextField
                      label="Label (shown in bill)" size="small" sx={{ flex: 1 }}
                      value={ch.label || ''} onChange={(e) => patch(key, 'label', e.target.value)}
                    />
                  </Stack>
                )}
              </Box>
            );
          })}

          <Divider sx={{ borderColor: b.borderSoft }} />
          <TextField
            label="Free delivery above (₹)" type="number" size="small" sx={{ maxWidth: 260 }}
            helperText="Order subtotal at or above this waives the delivery fee. 0 = no threshold."
            value={cfg.freeDeliveryAbove ?? 0}
            onChange={(e) => setCfg((c) => ({ ...c, freeDeliveryAbove: Math.max(0, Number(e.target.value) || 0) }))}
          />

          <Box>
            <Button variant="contained" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save charges'}</Button>
          </Box>
        </Stack>
      </Box>
    </>
  );
}
