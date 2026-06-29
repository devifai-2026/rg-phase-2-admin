import { Box, Stack, Typography, TextField, InputAdornment, Button } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import EmptyState from './EmptyState';

/**
 * Opinionated DataGrid wrapper. One source of truth for table height, toolbar
 * layout (title left · search/filters middle · actions/export right), empty +
 * loading states, and brand styling. Use the column builders in tableHelpers.
 */
export default function AdminTable({
  rows,
  columns,
  loading = false,
  height = 'auto',
  title,
  search,
  filters,
  toolbarActions,
  onExport,
  paginationMode = 'client',
  rowCount,
  paginationModel,
  onPaginationModelChange,
  pageSizeOptions = [25, 50, 100],
  emptyTitle = 'Nothing here yet',
  emptyHint,
  emptyIcon,
  getRowId,
  getRowClassName,
  rowSx,
  rowHeight = 64,
  onRowClick,
}) {
  const { palette } = useTheme();
  const b = palette.brand;

  const hasToolbar = title || search || filters || toolbarActions || onExport;

  return (
    <Box
      sx={{
        background: b.surface,
        border: `1px solid ${b.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: height === 'auto' ? 'calc(100vh - 200px)' : height,
        minHeight: 440,
      }}
    >
      {hasToolbar && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.5}
          sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${b.borderSoft}` }}
        >
          {title && <Typography variant="subtitle2" sx={{ color: b.text, fontWeight: 700, flexShrink: 0 }}>{title}</Typography>}
          {filters}
          <Box sx={{ flex: 1 }} />
          {search && (
            <TextField
              size="small"
              placeholder={search.placeholder || 'Search…'}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              sx={{ width: { xs: '100%', md: 240 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: b.textFaint }} /></InputAdornment> }}
            />
          )}
          {onExport && (
            <Button onClick={onExport} startIcon={<FileDownloadIcon />} variant="outlined" size="small" sx={{ flexShrink: 0 }}>Export</Button>
          )}
          {toolbarActions}
        </Stack>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          rowHeight={rowHeight}
          columnHeaderHeight={48}
          getRowId={getRowId || ((r) => r.id ?? r._id)}
          getRowClassName={getRowClassName}
          disableRowSelectionOnClick
          disableColumnMenu
          onRowClick={onRowClick}
          paginationMode={paginationMode}
          rowCount={paginationMode === 'server' ? rowCount : undefined}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={pageSizeOptions}
          initialState={paginationModel ? undefined : { pagination: { paginationModel: { pageSize: 25 } } }}
          slots={{ noRowsOverlay: () => <EmptyState title={emptyTitle} hint={emptyHint} icon={emptyIcon} /> }}
          sx={{
            border: 'none', borderRadius: 0,
            '& .MuiDataGrid-columnHeaders': { background: alpha(b.surface2, 0.6) },
            // Vertically center every cell's content so multi-line cells never
            // clip above/below the row band. overflow:hidden keeps tall content
            // contained instead of bleeding past the top of the row.
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', overflow: 'hidden' },
            // Avatar + 2-line label cells: keep stacked text tight so it fits the row.
            '& .MuiDataGrid-cell .MuiTypography-body2': { lineHeight: 1.3 },
            '& .MuiDataGrid-cell .MuiTypography-caption': { lineHeight: 1.3 },
            ...(onRowClick ? { '& .MuiDataGrid-row': { cursor: 'pointer' } } : {}),
            ...(rowSx || {}),
          }}
        />
      </Box>
    </Box>
  );
}
