import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Button, MenuItem, TextField, Autocomplete, FormControlLabel, Switch } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { useForm, useWatch } from 'react-hook-form';
import { AdminAPI, PublicAPI } from '../api/endpoints';
import EditorLayout from '../components/EditorLayout';
import { BundlePreview } from '../components/previews';
import { Field, rules } from '../components/formKit';

const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export default function BundleEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { palette } = useTheme();
  const b = palette.brand;
  const [products, setProducts] = useState([]);
  const [picked, setPicked] = useState([]);
  const [anchor, setAnchor] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const { register, handleSubmit, control, reset, setValue, formState: { errors, isValid } } = useForm({ mode: 'onChange', defaultValues: { name: '', pricingMode: 'percent', discountPercent: 10, bundlePrice: 0 } });
  const vals = useWatch({ control }) || {};

  useEffect(() => {
    let alive = true;
    (async () => {
      // Load the catalog first, then hydrate the bundle so product objects can
      // be matched by id. The populated bundle returns products as {_id,...} or
      // bare id strings depending on the route, so normalise both.
      const r = await PublicAPI.products({ limit: 500 });
      const list = r.data.data.items || [];
      if (!alive) return;
      setProducts(list);
      if (isNew) return;
      const res = await AdminAPI.listBundles();
      if (!alive) return;
      const bd = (res.data.data || []).find((x) => x._id === id);
      if (!bd) { toast.error('Bundle not found'); return; }
      const byId = (p) => list.find((x) => x._id === (p?._id || p));
      reset({
        name: bd.name || '',
        pricingMode: bd.pricingMode || 'percent',
        discountPercent: bd.discountPercent ?? 10,
        bundlePrice: bd.bundlePrice ?? 0,
      });
      setPicked((bd.products || []).map(byId).filter(Boolean));
      setAnchor(bd.anchorProduct ? byId(bd.anchorProduct) || null : null);
      setIsActive(bd.isActive !== false);
    })().catch(() => { if (alive) toast.error('Failed to load bundle'); });
    return () => { alive = false; };
  }, [id, isNew, reset]);

  const onSubmit = async (form) => {
    if (picked.length < 2) return toast.error('Pick at least 2 products');
    const body = { name: form.name, pricingMode: form.pricingMode, discountPercent: Number(form.discountPercent || 0), bundlePrice: Number(form.bundlePrice || 0), isActive, products: picked.map((p) => p._id), anchorProduct: anchor?._id };
    try {
      if (isNew) await AdminAPI.createBundle(body);
      else await AdminAPI.updateBundle(id, body);
      toast.success('Saved'); navigate('/bundles');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const form = (
    <form id="bundle-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        <Field name="name" label="Bundle name" register={register} errors={errors} rules={rules.required('Name')} />
        <Autocomplete multiple options={products} value={picked} onChange={(e, v) => setPicked(v.slice(0, 4))}
          getOptionLabel={(o) => `${o.name} (${rupees(o.price)})`} isOptionEqualToValue={(a, c) => a._id === c._id}
          renderInput={(p) => <TextField {...p} label="Products (2–4)" helperText="Pick 2 to 4 products" />} />
        <Autocomplete options={products} value={anchor} onChange={(e, v) => setAnchor(v)}
          getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, c) => a._id === c._id}
          renderInput={(p) => <TextField {...p} label="Anchor product (where it shows)" />} />
        <TextField label="Pricing mode" select fullWidth
          value={vals.pricingMode || 'percent'}
          onChange={(e) => setValue('pricingMode', e.target.value, { shouldValidate: true })}>
          <MenuItem value="percent">% off combined price</MenuItem>
          <MenuItem value="fixed">Fixed bundle price</MenuItem>
        </TextField>
        {vals.pricingMode === 'fixed'
          ? <Field name="bundlePrice" label="Bundle price ₹" type="number" register={register} errors={errors} rules={rules.money('Price')} />
          : <Field name="discountPercent" label="Discount %" type="number" register={register} errors={errors} rules={rules.positiveInt('Discount')} />}
        <FormControlLabel control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active" />
      </Stack>
    </form>
  );

  return (
    <EditorLayout
      title={isNew ? 'Add Bundle' : 'Edit Bundle'}
      subtitle="See the 'frequently bought together' widget live"
      backTo="/bundles"
      form={form}
      preview={<BundlePreview name={vals.name} products={picked} pricingMode={vals.pricingMode} discountPercent={Number(vals.discountPercent) || 0} bundlePrice={Number(vals.bundlePrice) || 0} />}
      actions={<>
        <Button onClick={() => navigate('/bundles')} sx={{ color: b.textDim }}>Cancel</Button>
        <Button type="submit" form="bundle-form" variant="contained" disabled={!isValid || picked.length < 2}>{isNew ? 'Create bundle' : 'Save changes'}</Button>
      </>}
    />
  );
}
