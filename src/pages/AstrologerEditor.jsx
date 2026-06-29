import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack, Button, Autocomplete, TextField, Divider, Typography, Grid, Box, Alert,
  FormControlLabel, Switch, IconButton, Rating, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';
import { useForm, useWatch } from 'react-hook-form';
import { AdminAPI, PublicAPI } from '../api/endpoints';
import EditorLayout from '../components/EditorLayout';
import { AstrologerPreview } from '../components/previews';
import { Field, rules, PhoneField } from '../components/formKit';
import ImageUpload from '../components/ImageUpload';
import ImageCropper from '../components/ImageCropper';

const EXPERTISE = ['Vedic', 'Numerology', 'Vastu', 'Tarot', 'Palmistry', 'Lal Kitab', 'KP', 'Nadi', 'Prashna', 'Western'];
const LANGS = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Malayalam'];

// EXACT gift catalog from the user app (flutter/user/.../gift_sheet.dart) — same
// names, emoji and token costs, no extras. Keep in sync with the app's _gifts.
const GIFTS = [
  { emoji: '🌹', name: 'Rose', tokens: 5 },
  { emoji: '🌟', name: 'Star', tokens: 10 },
  { emoji: '☀️', name: 'Surya', tokens: 15 },
  { emoji: '🌙', name: 'Moon', tokens: 25 },
  { emoji: '🌸', name: 'Lotus', tokens: 20 },
  { emoji: '💎', name: 'Gemstone', tokens: 50 },
  { emoji: '👑', name: 'Crown', tokens: 100 },
];

export default function AstrologerEditor() {
  const { id } = useParams(); // 'new' or an id
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { palette } = useTheme();
  const b = palette.brand;
  const [avatar, setAvatar] = useState('');
  const [coverPhoto, setCoverPhoto] = useState('');
  const [expertise, setExpertise] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [acceptsFreeChat, setAcceptsFreeChat] = useState(false);
  const [kycDocs, setKycDocs] = useState({ aadhaar: '', pan: '', bankPassbook: '' });
  // Fake/seeded display numbers + admin reviews (only persisted for existing profiles).
  const [giftItems, setGiftItems] = useState([]); // [{name, count}] — name = one of GIFTS above
  const [expertiseCatalog, setExpertiseCatalog] = useState(EXPERTISE); // shared catalog (Autocomplete options)
  const [reviews, setReviews] = useState([]); // from Review collection (existing only)
  const [reviewDraft, setReviewDraft] = useState({ authorName: '', rating: 5, comment: '' });
  // The phone on file when editing (to detect a change → re-verify via OTP).
  const [loadedPhone, setLoadedPhone] = useState('');
  // OTP gate: when the phone is new/changed, verify it before saving.
  const [otp, setOtp] = useState({ open: false, code: '', sending: false, saving: false, body: null });
  const { register, handleSubmit, control, reset, formState: { errors, isValid } } = useForm({
    mode: 'onChange',
    defaultValues: { call_rate: 0, call_cut: 0, chat_rate: 0, chat_cut: 0, video_rate: 0, video_cut: 0, followerSeed: 0, giftCount: 0, bio: '' },
  });
  const vals = useWatch({ control }) || {};

  // Load the shared expertise catalog for the Autocomplete options (merged with
  // the built-in defaults). Typing a new value + saving adds it to the catalog
  // (backend ensureExpertise), so it then appears in the app + future editors.
  useEffect(() => {
    PublicAPI.expertise()
      .then((r) => {
        const list = r.data.data || [];
        setExpertiseCatalog([...new Set([...list, ...EXPERTISE])]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    AdminAPI.getAstrologer(id).then((r) => {
      const a = r.data.data;
      // Stored phone is 91+10; the form/UI works with the bare 10-digit number.
      const phone10 = (a.user?.phone || '').replace(/\D/g, '').slice(-10);
      setLoadedPhone(phone10);
      reset({
        name: a.displayName || a.user?.name, email: a.user?.email || '', bio: a.bio || '', phone: phone10,
        address: a.location?.address || '', city: a.location?.city || '', state: a.location?.state || '', pincode: a.location?.pincode || '',
        aadhaarNumber: a.kyc?.aadhaarNumber || '', panNumber: a.kyc?.panNumber || '',
        followerSeed: a.followerSeed || 0, giftCount: a.giftDisplay?.count || 0,
        call_rate: a.rates?.call?.ratePerMin || 0, call_cut: a.rates?.call?.adminCutPerMin || 0, chat_rate: a.rates?.chat?.ratePerMin || 0, chat_cut: a.rates?.chat?.adminCutPerMin || 0, video_rate: a.rates?.video?.ratePerMin || 0, video_cut: a.rates?.video?.adminCutPerMin || 0,
      });
      setAvatar(a.avatar || ''); setCoverPhoto(a.coverPhoto || ''); setExpertise(a.expertise || []); setLanguages(a.languages || []);
      setIsFeatured(!!a.isFeatured); setAcceptsFreeChat(!!a.acceptsFreeChat);
      setGiftItems(a.giftDisplay?.items || []);
      setKycDocs({ aadhaar: a.kycDocuments?.aadhaar || '', pan: a.kycDocuments?.pan || '', bankPassbook: a.kycDocuments?.bankPassbook || '' });
    }).catch(() => toast.error('Failed to load'));
    // Reviews come from the Review collection (admin + user reviews) via /full.
    AdminAPI.astrologerFull(id).then((r) => setReviews(r.data.data.reviews || [])).catch(() => {});
  }, [id, isNew, reset]);

  const cutErrors = ['call', 'chat', 'video'].reduce((acc, s) => {
    if (Number(vals[`${s}_cut`] || 0) > Number(vals[`${s}_rate`] || 0)) acc[s] = `${s}: admin cut cannot exceed rate`;
    return acc;
  }, {});
  const hasCutError = Object.keys(cutErrors).length > 0;

  const onSubmit = async (form) => {
    if (hasCutError) return;
    const body = {
      displayName: form.name, avatar, coverPhoto, bio: (form.bio || '').trim(), expertise, languages, isFeatured, acceptsFreeChat,
      followerSeed: Number(form.followerSeed || 0),
      giftDisplay: { count: Number(form.giftCount || 0), items: giftItems.filter((g) => g.name).map((g) => ({ name: g.name, count: Number(g.count || 0) })) },
      location: { address: form.address, city: form.city, state: form.state, pincode: form.pincode },
      kyc: { aadhaarNumber: (form.aadhaarNumber || '').trim(), panNumber: (form.panNumber || '').trim().toUpperCase() },
      kycDocuments: { aadhaar: kycDocs.aadhaar, pan: kycDocs.pan, bankPassbook: kycDocs.bankPassbook },
      rates: {
        call: { enabled: true, rateRupeesPerMin: +form.call_rate, adminCutRupeesPerMin: +form.call_cut },
        chat: { enabled: true, rateRupeesPerMin: +form.chat_rate, adminCutRupeesPerMin: +form.chat_cut },
        video: { enabled: true, rateRupeesPerMin: +form.video_rate, adminCutRupeesPerMin: +form.video_cut },
      },
    };
    const phone10 = (form.phone || '').replace(/\D/g, '').slice(-10);
    const phoneChanged = !isNew && phone10 && phone10 !== loadedPhone;

    // New astrologer or a changed phone → verify the number via OTP first.
    if (isNew || phoneChanged) {
      const full = isNew
        ? { ...body, name: form.name, phone: phone10, email: form.email, applicationStatus: 'active' }
        : { ...body, phone: phone10, name: form.name, email: form.email };
      await requestOtpFor(phone10, full);
      return;
    }

    try {
      await AdminAPI.updateAstrologer(id, body);
      toast.success('Saved');
      navigate('/astrologers');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  // Open the OTP dialog and send a code to the (new/changed) phone.
  const requestOtpFor = async (phone10, body) => {
    setOtp({ open: true, code: '', sending: true, saving: false, body });
    try {
      await AdminAPI.requestAstrologerOtp(phone10);
      toast.success('OTP sent (use 123456 in dev)');
      setOtp((s) => ({ ...s, sending: false }));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send OTP');
      setOtp({ open: false, code: '', sending: false, saving: false, body: null });
    }
  };

  // Confirm: submit create/update with the verified code.
  const confirmOtp = async () => {
    if (otp.code.length !== 6) return toast.error('Enter the 6-digit OTP');
    setOtp((s) => ({ ...s, saving: true }));
    try {
      const payload = { ...otp.body, code: otp.code };
      if (isNew) { await AdminAPI.createAstrologer(payload); toast.success('Astrologer created'); }
      else { await AdminAPI.updateAstrologer(id, payload); toast.success('Saved'); }
      setOtp({ open: false, code: '', sending: false, saving: false, body: null });
      navigate('/astrologers');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
      setOtp((s) => ({ ...s, saving: false }));
    }
  };

  // ── Fake review management (existing profile only) ──
  const addReview = async () => {
    if (isNew) return toast.error('Create the astrologer first, then add reviews');
    if (!reviewDraft.comment.trim()) return toast.error('Write a review comment');
    try {
      await AdminAPI.addAstrologerReview(id, { rating: reviewDraft.rating, comment: reviewDraft.comment.trim(), authorName: reviewDraft.authorName.trim() });
      toast.success('Review added');
      setReviewDraft({ authorName: '', rating: 5, comment: '' });
      const r = await AdminAPI.astrologerFull(id); setReviews(r.data.data.reviews || []);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const removeReview = async (rid) => {
    try { await AdminAPI.deleteReview(rid); setReviews((rs) => rs.filter((x) => x._id !== rid)); } catch { toast.error('Delete failed'); }
  };

  const previewRates = {
    call: { rateRupeesPerMin: vals.call_rate }, chat: { rateRupeesPerMin: vals.chat_rate }, video: { rateRupeesPerMin: vals.video_rate },
  };

  // Show saved reviews plus the in-progress draft live in the preview.
  const previewReviews = [
    ...(reviewDraft.comment.trim() ? [{ authorName: reviewDraft.authorName || 'New reviewer', rating: reviewDraft.rating, comment: reviewDraft.comment, _draft: true }] : []),
    ...reviews,
  ];

  const form = (
    <form id="astro-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        <Divider sx={{ borderColor: b.borderSoft }}><Typography variant="caption" sx={{ color: b.textDim }}>Cover photo (LinkedIn/FB-style header)</Typography></Divider>
        <ImageCropper value={coverPhoto} onChange={setCoverPhoto} aspect={2.4} outWidth={1200} outHeight={500} label="cover" />
        <ImageUpload value={avatar} onChange={setAvatar} label="profile photo" fallback={(vals.name || 'A')[0]} />
        <Field name="name" label="Display name" register={register} errors={errors} rules={rules.required('Name')} />
        <PhoneField control={control} />
        <Field name="email" label="Email (optional)" register={register} errors={errors} rules={rules.email} />
        <Alert icon={<InfoIcon fontSize="inherit" />} severity="info" sx={{ background: alpha(b.blue, 0.1), color: b.text, border: `1px solid ${alpha(b.blue, 0.3)}`, '& .MuiAlert-icon': { color: b.blue } }}>
          This phone is the astrologer's <b>login</b> — they sign in with OTP.{!isNew && ' Changing it requires re-verification.'}
        </Alert>
        <TextField label="Bio (auto-translated to all languages)" multiline rows={3} fullWidth InputLabelProps={{ shrink: true }}
          {...register('bio')} placeholder="A short introduction shown on the profile…" />
        {/* freeSolo + the shared catalog = pick existing OR type a new one. A
            typed value commits on blur (selectOnFocus/clearOnBlur), and on save
            it's added to the catalog so the app + future editors get it. */}
        <Autocomplete
          multiple freeSolo selectOnFocus handleHomeEndKeys
          options={expertiseCatalog}
          value={expertise}
          onChange={(e, v) => setExpertise(v.map((s) => s.trim()).filter(Boolean))}
          renderInput={(p) => <TextField {...p} label="Expertise" placeholder="Type to add a new one…" helperText="Pick from the list or type a new expertise and press Enter." />}
        />
        <Autocomplete multiple freeSolo options={LANGS} value={languages} onChange={(e, v) => setLanguages(v)} renderInput={(p) => <TextField {...p} label="Languages" />} />

        <Divider sx={{ borderColor: b.borderSoft }}><Typography variant="caption" sx={{ color: b.textDim }}>Profile stats (seeded display values)</Typography></Divider>
        <Alert icon={<InfoIcon fontSize="inherit" />} severity="info" sx={{ background: alpha(b.amber, 0.08), color: b.text, border: `1px solid ${alpha(b.amber, 0.25)}`, '& .MuiAlert-icon': { color: b.amber } }}>
          These are display-only numbers shown on the profile. Real follows/gifts add on top.
        </Alert>
        <Grid container spacing={1.5}>
          <Grid item xs={6}><Field name="followerSeed" label="Followers (baseline)" type="number" register={register} errors={errors} inputProps={{ min: 0 }} /></Grid>
          <Grid item xs={6}><Field name="giftCount" label="Gifts received (total)" type="number" register={register} errors={errors} inputProps={{ min: 0 }} /></Grid>
        </Grid>
        {/* Gift breakdown — the exact gifts the user app offers (name + emoji). */}
        <Box>
          <Typography variant="caption" sx={{ color: b.textDim }}>Gift breakdown (optional · the same gifts shown in the app)</Typography>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {giftItems.map((g, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField select size="small" label="Gift" value={GIFTS.some((x) => x.name === g.name) ? g.name : ''}
                  onChange={(e) => setGiftItems((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  sx={{ flex: 1 }} SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}>
                  {GIFTS.map((gc) => (
                    <MenuItem key={gc.name} value={gc.name}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span style={{ fontSize: 18 }}>{gc.emoji}</span>
                        <span>{gc.name}</span>
                        <Typography variant="caption" sx={{ color: b.textFaint }}>· {gc.tokens} tok</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
                <TextField size="small" type="number" label="Count" value={g.count} onChange={(e) => setGiftItems((arr) => arr.map((x, j) => j === i ? { ...x, count: e.target.value } : x))} sx={{ width: 90 }} inputProps={{ min: 0 }} />
                <IconButton size="small" onClick={() => setGiftItems((arr) => arr.filter((_, j) => j !== i))} sx={{ color: b.red }}><DeleteIcon fontSize="small" /></IconButton>
              </Stack>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => setGiftItems((arr) => [...arr, { name: '', count: 0 }])} sx={{ alignSelf: 'flex-start', color: b.textDim }}>Add gift</Button>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: b.borderSoft }}><Typography variant="caption" sx={{ color: b.textDim }}>Location (shown as "nearby" in the app)</Typography></Divider>
        <Field name="address" label="Address" register={register} errors={errors} rules={isNew ? rules.required('Address') : {}} />
        <Grid container spacing={1.5}>
          <Grid item xs={6}><Field name="city" label="City" register={register} errors={errors} /></Grid>
          <Grid item xs={6}><Field name="state" label="State" register={register} errors={errors} /></Grid>
        </Grid>
        <Field name="pincode" label="Pincode (6 digits)" register={register} errors={errors}
          rules={isNew ? { required: 'Pincode is required', pattern: { value: /^\d{6}$/, message: '6 digits' } } : { pattern: { value: /^\d{6}$/, message: '6 digits' } }}
          inputProps={{ maxLength: 6, inputMode: 'numeric' }} />

        <Divider sx={{ borderColor: b.borderSoft }}><Typography variant="caption" sx={{ color: b.textDim }}>Visibility & programs</Typography></Divider>
        <Stack>
          <FormControlLabel control={<Switch checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />} label="Featured astrologer (shown in the app's featured section)" />
          <FormControlLabel control={<Switch checked={acceptsFreeChat} onChange={(e) => setAcceptsFreeChat(e.target.checked)} />} label="Accepts new-user free chat" />
        </Stack>

        <Divider sx={{ borderColor: b.borderSoft }}><Typography variant="caption" sx={{ color: b.textDim }}>Per-minute rates & admin commission (₹)</Typography></Divider>
        {['call', 'chat', 'video'].map((svc) => (
          <Box key={svc}>
            <Grid container spacing={1.5} alignItems="flex-start">
              <Grid item xs={4}><Typography sx={{ textTransform: 'capitalize', fontWeight: 600, mt: 1.2 }}>{svc}</Typography></Grid>
              <Grid item xs={4}><Field name={`${svc}_rate`} label="Rate ₹/min" type="number" register={register} errors={errors} rules={rules.ratePerMin('Rate')} inputProps={{ min: 0, max: 100 }} /></Grid>
              <Grid item xs={4}><Field name={`${svc}_cut`} label="Admin ₹/min" type="number" register={register} errors={errors} rules={rules.ratePerMin('Admin cut')} inputProps={{ min: 0, max: 100 }} /></Grid>
            </Grid>
            {cutErrors[svc] && <Typography variant="caption" sx={{ color: b.red }}>{cutErrors[svc]}</Typography>}
          </Box>
        ))}

        {/* Fake reviews — manage after creation */}
        <Divider sx={{ borderColor: b.borderSoft }}><Typography variant="caption" sx={{ color: b.textDim }}>Reviews (admin can write fake-name testimonials)</Typography></Divider>
        {isNew ? (
          <Alert severity="info" sx={{ background: alpha(b.blue, 0.08), color: b.text, border: `1px solid ${alpha(b.blue, 0.25)}`, '& .MuiAlert-icon': { color: b.blue } }}>
            Create the astrologer first — then you can add reviews here.
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            {reviews.map((r) => (
              <Stack key={r._id} direction="row" spacing={1} alignItems="flex-start" sx={{ p: 1.25, borderRadius: 1.5, border: `1px solid ${b.borderSoft}` }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{r.authorName || r.user?.name || 'User'}</Typography>
                    <Rating value={r.rating} size="small" readOnly sx={{ fontSize: 14 }} />
                    {r.source === 'admin' && <Box sx={{ px: 0.75, borderRadius: 1, fontSize: 9, fontWeight: 700, background: alpha(b.amber, 0.16), color: b.amber }}>FAKE</Box>}
                  </Stack>
                  {r.comment && <Typography variant="caption" sx={{ color: b.textDim }}>{r.comment}</Typography>}
                </Box>
                {r.source === 'admin' && <IconButton size="small" onClick={() => removeReview(r._id)} sx={{ color: b.red }}><DeleteIcon fontSize="small" /></IconButton>}
              </Stack>
            ))}
            <Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px dashed ${b.border}` }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField size="small" label="Author name" value={reviewDraft.authorName} onChange={(e) => setReviewDraft((d) => ({ ...d, authorName: e.target.value }))} sx={{ flex: 1 }} placeholder="e.g. Priya S." />
                  <Rating value={reviewDraft.rating} onChange={(e, v) => setReviewDraft((d) => ({ ...d, rating: v || 5 }))} />
                </Stack>
                <TextField size="small" label="Comment" multiline rows={2} value={reviewDraft.comment} onChange={(e) => setReviewDraft((d) => ({ ...d, comment: e.target.value }))} />
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addReview} sx={{ alignSelf: 'flex-start' }}>Add review</Button>
              </Stack>
            </Box>
          </Stack>
        )}

        <Divider sx={{ borderColor: b.borderSoft }}><Typography variant="caption" sx={{ color: b.textDim }}>KYC — optional (Aadhaar · PAN · Bank passbook)</Typography></Divider>
        <Alert icon={<InfoIcon fontSize="inherit" />} severity="info" sx={{ background: alpha(b.blue, 0.08), color: b.text, border: `1px solid ${alpha(b.blue, 0.25)}`, '& .MuiAlert-icon': { color: b.blue } }}>
          KYC is optional and never blocks onboarding. Fill what you have — you can complete it later.
        </Alert>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <Field name="aadhaarNumber" label="Aadhaar number (optional)" register={register} errors={errors}
              rules={{ pattern: { value: /^\d{12}$/, message: '12 digits' } }} inputProps={{ maxLength: 12, inputMode: 'numeric' }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field name="panNumber" label="PAN number (optional)" register={register} errors={errors}
              rules={{ pattern: { value: /^[A-Za-z]{5}\d{4}[A-Za-z]$/, message: 'e.g. ABCDE1234F' } }} inputProps={{ maxLength: 10, style: { textTransform: 'uppercase' } }} />
          </Grid>
        </Grid>
        <Stack spacing={1.5}>
          <ImageUpload value={kycDocs.aadhaar} onChange={(url) => setKycDocs((s) => ({ ...s, aadhaar: url }))} label="Aadhaar card" variant="rounded" size={56} fallback="A" />
          <ImageUpload value={kycDocs.pan} onChange={(url) => setKycDocs((s) => ({ ...s, pan: url }))} label="PAN card" variant="rounded" size={56} fallback="P" />
          <ImageUpload value={kycDocs.bankPassbook} onChange={(url) => setKycDocs((s) => ({ ...s, bankPassbook: url }))} label="Bank passbook" variant="rounded" size={56} fallback="B" />
        </Stack>
      </Stack>
    </form>
  );

  return (
    <>
      <EditorLayout
        title={isNew ? 'Add Astrologer' : 'Edit Astrologer'}
        subtitle="Fill the details — the app preview updates live"
        backTo="/astrologers"
        form={form}
        preview={<AstrologerPreview name={vals.name} avatar={avatar} coverPhoto={coverPhoto} bio={vals.bio}
          expertise={expertise} languages={languages} rates={previewRates} online
          followers={Number(vals.followerSeed || 0)} giftCount={Number(vals.giftCount || 0)}
          giftItems={giftItems} reviews={previewReviews} />}
        actions={<>
          <Button onClick={() => navigate('/astrologers')} sx={{ color: b.textDim }}>Cancel</Button>
          <Button type="submit" form="astro-form" variant="contained" disabled={!isValid || hasCutError}>{isNew ? 'Create astrologer' : 'Save changes'}</Button>
        </>}
      />

      {/* Phone-verification gate — shown on create or when the phone changed. */}
      <Dialog open={otp.open} onClose={() => !otp.saving && setOtp({ open: false, code: '', sending: false, saving: false, body: null })}
        maxWidth="xs" fullWidth PaperProps={{ sx: { background: b.surface, border: `1px solid ${b.border}` } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Verify phone number</DialogTitle>
        <DialogContent dividers sx={{ borderColor: b.borderSoft }}>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: b.textDim }}>
              We sent a 6-digit code to <b>+91 {otp.body?.phone}</b>. Enter it to confirm this number{isNew ? '' : ' change'}.
            </Typography>
            <TextField label="6-digit OTP" value={otp.code} autoFocus fullWidth disabled={otp.sending}
              helperText="Use 123456 in dev"
              onChange={(e) => setOtp((s) => ({ ...s, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOtp({ open: false, code: '', sending: false, saving: false, body: null })} disabled={otp.saving} sx={{ color: b.textDim }}>Cancel</Button>
          <Button variant="contained" onClick={confirmOtp} disabled={otp.sending || otp.saving || otp.code.length !== 6}>
            {otp.saving ? 'Saving…' : (isNew ? 'Verify & create' : 'Verify & save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
