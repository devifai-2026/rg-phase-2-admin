import { useRef, useState } from 'react';
import { Box, Avatar, Button, Stack, Typography, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import toast from 'react-hot-toast';
import { PublicAPI } from '../api/endpoints';

/**
 * Single-image picker with live preview + uploading spinner overlay.
 * value = current image URL; onChange(url) called after upload.
 * variant 'circular' (avatar) or 'rounded' (product/pooja thumbnail).
 */
export default function ImageUpload({ value, onChange, label = 'photo', size = 64, variant = 'circular', fallback = 'A' }) {
  const { palette } = useTheme();
  const b = palette.brand;
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      const { data } = await PublicAPI.uploadImage(fd);
      onChange(data.data.url);
      toast.success('Photo uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <Avatar variant={variant} src={value} sx={{ width: size, height: size, fontSize: size * 0.38, bgcolor: b.surface2, border: `1px solid ${b.border}` }}>
          {fallback}
        </Avatar>
        {uploading && (
          <Box sx={{ position: 'absolute', inset: 0, borderRadius: variant === 'circular' ? '50%' : 2, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={size * 0.4} sx={{ color: '#fff' }} />
          </Box>
        )}
      </Box>
      <Box>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <Button startIcon={<PhotoCameraIcon />} variant="outlined" size="small" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? 'Uploading…' : value ? `Change ${label}` : `Upload ${label}`}
        </Button>
        <Typography variant="caption" sx={{ display: 'block', color: b.textFaint, mt: 0.5 }}>JPG/PNG, up to 8MB</Typography>
      </Box>
    </Stack>
  );
}
