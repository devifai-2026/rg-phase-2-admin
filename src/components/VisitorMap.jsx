import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box } from '@mui/material';

// Pan/zoom to fit all points whenever they change.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 6);
      return;
    }
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [30, 30], maxZoom: 8 }
    );
  }, [points, map]);
  return null;
}

/**
 * Leaflet map of visitor locations. `points` = [{ lat, lon, city, country,
 * visits, conversions }]. Marker size scales with visit count; converted
 * clusters glow accent.
 */
export default function VisitorMap({ points = [], height = 320, accent = '#C0392B' }) {
  const valid = points.filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number');
  const max = valid.reduce((m, p) => Math.max(m, p.visits), 1);

  if (!valid.length) {
    return (
      <Box sx={{ height, display: 'grid', placeItems: 'center', color: 'text.disabled', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
        No located visitors yet
      </Box>
    );
  }

  return (
    <Box sx={{ height, borderRadius: 2, overflow: 'hidden', '& .leaflet-container': { height: '100%', width: '100%', background: '#0d1117' } }}>
      <MapContainer center={[22, 79]} zoom={4} scrollWheelZoom={false} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <FitBounds points={valid} />
        {valid.map((p, i) => {
          const r = 5 + (p.visits / max) * 16;
          const converted = p.conversions > 0;
          return (
            <CircleMarker
              key={i}
              center={[p.lat, p.lon]}
              radius={r}
              pathOptions={{
                color: converted ? '#3CCB7F' : accent,
                fillColor: converted ? '#3CCB7F' : accent,
                fillOpacity: 0.45,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top">
                <strong>{[p.city, p.country].filter(Boolean).join(', ') || 'Unknown'}</strong>
                <br />
                {p.visits} visit{p.visits === 1 ? '' : 's'}
                {p.conversions > 0 ? ` · ${p.conversions} converted` : ''}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </Box>
  );
}
