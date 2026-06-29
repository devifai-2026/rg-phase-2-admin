import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Typography,
  Slider, CircularProgress, IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CropIcon from '@mui/icons-material/Crop';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import toast from 'react-hot-toast';
import { PublicAPI } from '../api/endpoints';

/**
 * Aspect-locked image cropper with pan + zoom, rendered to an exact output
 * resolution so the in-app image fits its frame without distortion and without
 * quality loss (we sample the ORIGINAL bitmap at full resolution — no upscaling
 * of an already-shrunk preview). The cropped blob is uploaded via /users/upload.
 *
 * Props:
 *  - value: current image URL (shown as the preview swatch)
 *  - onChange(url): called with the uploaded cropped URL
 *  - aspect: width/height ratio to lock (default 5 → 5:1 promo strip)
 *  - outWidth/outHeight: exact export pixels (default 1200×240)
 *  - label: button text noun
 */
export default function ImageCropper({
  value, onChange, aspect = 5, outWidth = 1200, outHeight = 240, label = 'banner',
  maxFrameH = 360, // cap the on-screen frame height (portrait crops would be huge otherwise)
}) {
  const { palette } = useTheme();
  const b = palette.brand;
  const fileRef = useRef();
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState(null); // object URL of the picked file
  const [img, setImg] = useState(null); // loaded HTMLImageElement
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // crop translation in frame px
  const [uploading, setUploading] = useState(false);
  const frameRef = useRef(null);
  const drag = useRef(null);

  // Frame display dimensions (CSS px) — keeps the chosen aspect on screen. Cap
  // the height (for tall/portrait crops) and derive width from the aspect so the
  // frame fits the dialog regardless of ratio.
  let FRAME_W = 520;
  let FRAME_H = Math.round(FRAME_W / aspect);
  if (FRAME_H > maxFrameH) { FRAME_H = maxFrameH; FRAME_W = Math.round(FRAME_H * aspect); }

  // Base scale: cover the frame at zoom=1 (so the image always fills it).
  const baseScale = img ? Math.max(FRAME_W / img.width, FRAME_H / img.height) : 1;
  const scale = baseScale * zoom;
  const drawW = img ? img.width * scale : 0;
  const drawH = img ? img.height * scale : 0;

  // Clamp the offset so the image edges never reveal empty space inside the frame.
  const clamp = useCallback((o) => {
    const maxX = Math.max(0, (drawW - FRAME_W) / 2);
    const maxY = Math.max(0, (drawH - FRAME_H) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, o.x)), y: Math.max(-maxY, Math.min(maxY, o.y)) };
  }, [drawW, drawH, FRAME_W, FRAME_H]);

  useEffect(() => { setOffset((o) => clamp(o)); }, [zoom, clamp]);

  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      setImg(im); setSrc(url); setZoom(1); setOffset({ x: 0, y: 0 }); setOpen(true);
    };
    im.onerror = () => toast.error('Could not read image');
    im.src = url;
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPointerDown = (e) => {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    setOffset(clamp({ x: drag.current.ox + dx, y: drag.current.oy + dy }));
  };
  const onPointerUp = () => { drag.current = null; };

  const exportBlob = () => new Promise((resolve) => {
    // Map the on-screen frame → original-image coordinates, then draw the source
    // region at the exact output resolution. Sampling the original bitmap keeps
    // full quality (no intermediate downscale).
    const canvas = document.createElement('canvas');
    canvas.width = outWidth; canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    // Top-left of the drawn image relative to the frame, in frame px.
    const imgLeft = (FRAME_W - drawW) / 2 + offset.x;
    const imgTop = (FRAME_H - drawH) / 2 + offset.y;
    // Frame's top-left in source-image px.
    const srcX = (-imgLeft) / scale;
    const srcY = (-imgTop) / scale;
    const srcW = FRAME_W / scale;
    const srcH = FRAME_H / scale;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outWidth, outHeight);
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });

  const apply = async () => {
    setUploading(true);
    try {
      const blob = await exportBlob();
      const fd = new FormData();
      fd.append('image', blob, `${label}-${outWidth}x${outHeight}.jpg`);
      const { data } = await PublicAPI.uploadImage(fd);
      onChange(data.data.url);
      toast.success('Banner image set');
      setOpen(false);
      if (src) URL.revokeObjectURL(src);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 200, height: 200 / aspect, borderRadius: 1.5, flexShrink: 0,
            border: `1px solid ${b.border}`, background: value ? `url(${value}) center/cover` : b.surface2,
            display: 'grid', placeItems: 'center',
          }}
        >
          {!value && <Typography variant="caption" sx={{ color: b.textFaint }}>No image</Typography>}
        </Box>
        <Box>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
          <Button startIcon={<CropIcon />} variant="outlined" size="small" onClick={() => fileRef.current?.click()}>
            {value ? `Replace ${label}` : `Upload & crop ${label}`}
          </Button>
          <Typography variant="caption" sx={{ display: 'block', color: b.textFaint, mt: 0.5 }}>
            Locked to {aspect}:1 · exports {outWidth}×{outHeight}px
          </Typography>
        </Box>
      </Stack>

      <Dialog open={open} onClose={() => !uploading && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Crop {label}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: b.textDim, mb: 1.5 }}>
            Drag to reposition, zoom to fit. The frame matches the app exactly.
          </Typography>
          <Box
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            sx={{
              position: 'relative', width: FRAME_W, maxWidth: '100%', height: FRAME_H, mx: 'auto',
              overflow: 'hidden', borderRadius: 1.5, border: `2px solid ${b.red}`,
              cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none', background: '#000',
            }}
          >
            {img && (
              <img
                src={src}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: drawW, height: drawH,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  userSelect: 'none', pointerEvents: 'none',
                }}
              />
            )}
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
            <IconButton size="small" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}><ZoomOutIcon fontSize="small" /></IconButton>
            <Slider value={zoom} min={1} max={4} step={0.01} onChange={(e, v) => setZoom(v)} sx={{ flex: 1 }} />
            <IconButton size="small" onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))}><ZoomInIcon fontSize="small" /></IconButton>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={uploading} sx={{ color: b.textDim }}>Cancel</Button>
          <Button onClick={apply} variant="contained" disabled={uploading} startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CropIcon />}>
            {uploading ? 'Uploading…' : 'Crop & use'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
