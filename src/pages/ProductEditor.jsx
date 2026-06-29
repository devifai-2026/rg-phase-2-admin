import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Button, MenuItem, TextField, Box, Avatar, IconButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import UploadIcon from '@mui/icons-material/CloudUpload';
import toast from 'react-hot-toast';
import { useForm, useWatch } from 'react-hook-form';
import { AdminAPI, PublicAPI } from '../api/endpoints';
import EditorLayout from '../components/EditorLayout';
import { ProductPreview } from '../components/previews';
import { Field, rules } from '../components/formKit';

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { palette } = useTheme();
  const b = palette.brand;
  const [cats, setCats] = useState([]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const { register, handleSubmit, control, reset, formState: { errors, isValid } } = useForm({ mode: 'onChange', defaultValues: { priceRupees: 0, mrpRupees: 0, stock: 0, category: '' } });
  const vals = useWatch({ control }) || {};

  useEffect(() => {
    PublicAPI.categories().then((r) => setCats(r.data.data)).catch(() => {});
    if (isNew) return;
    PublicAPI.products({ limit: 200 }).then((r) => {
      const p = r.data.data.items.find((x) => x._id === id);
      if (!p) return;
      reset({ name: p.name, category: p.category || '', description: p.description || '', priceRupees: p.price, mrpRupees: p.mrp || 0, stock: p.stock,
        manualSoldCount: p.manualSoldCount || 0, manualRating: p.manualRating || 0, manualReviewCount: p.manualReviewCount || 0 });
      setImages(p.images || []);
    });
  }, [id, isNew, reset]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const fd = new FormData(); fd.append('image', file); const { data } = await PublicAPI.uploadImage(fd); setImages((p) => [...p, data.data.url]); toast.success('Uploaded'); }
    catch { toast.error('Upload failed'); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const onSubmit = async (form) => {
    const body = { ...form, priceRupees: Number(form.priceRupees), mrpRupees: Number(form.mrpRupees || 0), stock: Number(form.stock), images,
      manualSoldCount: Number(form.manualSoldCount || 0), manualRating: Number(form.manualRating || 0), manualReviewCount: Number(form.manualReviewCount || 0) };
    try {
      if (isNew) await AdminAPI.createProduct(body);
      else await AdminAPI.updateProduct(id, body);
      toast.success('Saved'); navigate('/products');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const catName = cats.find((c) => c._id === vals.category)?.name;

  const form = (
    <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        <Field name="name" label="Product name" register={register} errors={errors} rules={rules.required('Name')} />
        <TextField label="Category" select fullWidth defaultValue="" {...register('category')}>
          <MenuItem value="">— None —</MenuItem>
          {cats.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
        </TextField>
        <TextField label="Description" multiline rows={3} fullWidth {...register('description')} />
        <Stack direction="row" spacing={2}>
          <Field name="mrpRupees" label="MRP ₹ (struck)" type="number" register={register} errors={errors} rules={{ min: { value: 0, message: 'No negatives' } }} />
          <Field name="priceRupees" label="Selling ₹" type="number" register={register} errors={errors} rules={rules.money('Price')} />
          <Field name="stock" label="Stock" type="number" register={register} errors={errors} rules={rules.positiveInt('Stock')} />
        </Stack>
        <Box>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
          <Button startIcon={<UploadIcon />} variant="outlined" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'Uploading…' : 'Upload image'}</Button>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }} useFlexGap>
            {images.map((url, i) => (
              <Box key={i} sx={{ position: 'relative' }}>
                <Avatar variant="rounded" src={url} sx={{ width: 56, height: 56 }} />
                <IconButton size="small" onClick={() => setImages(images.filter((_, idx) => idx !== i))} sx={{ position: 'absolute', top: -8, right: -8, background: b.red, color: '#fff', width: 20, height: 20, '&:hover': { background: b.red } }}>×</IconButton>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Social proof (seed). Shown to users UNTIL real sales/reviews pass 10,
            then the real numbers take over automatically. */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="overline" sx={{ color: b.textDim }}>Social proof (seed)</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: b.textDim, mb: 1 }}>
            Shown until the product has 10+ real sales / reviews, then real numbers replace these.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Field name="manualSoldCount" label="Sold count" type="number" register={register} errors={errors} rules={{ min: { value: 0, message: 'No negatives' } }} />
            <Field name="manualRating" label="Rating (0–5)" type="number" register={register} errors={errors} rules={{ min: { value: 0, message: '0–5' }, max: { value: 5, message: '0–5' } }} />
            <Field name="manualReviewCount" label="Reviews" type="number" register={register} errors={errors} rules={{ min: { value: 0, message: 'No negatives' } }} />
          </Stack>
        </Box>
      </Stack>
    </form>
  );

  return (
    <EditorLayout
      title={isNew ? 'Add Product' : 'Edit Product'}
      subtitle="The app product page updates live as you edit"
      backTo="/products"
      form={form}
      preview={<ProductPreview name={vals.name} images={images} price={Number(vals.priceRupees) || 0} mrp={Number(vals.mrpRupees) || 0} stock={Number(vals.stock) || 0} description={vals.description} categoryName={catName} />}
      actions={<>
        <Button onClick={() => navigate('/products')} sx={{ color: b.textDim }}>Cancel</Button>
        <Button type="submit" form="product-form" variant="contained" disabled={!isValid}>{isNew ? 'Create product' : 'Save changes'}</Button>
      </>}
    />
  );
}
