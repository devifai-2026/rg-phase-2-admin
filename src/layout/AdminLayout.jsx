import { useState, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton, ListItemIcon, ListItemText,
  IconButton, Avatar, Menu, MenuItem, Divider, Chip, useMediaQuery, Tooltip, Collapse, Badge,
  Popover, Popper, Paper,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import StarIcon from '@mui/icons-material/AutoAwesome';
import LeaderboardIcon from '@mui/icons-material/EmojiEvents';
import AiIcon from '@mui/icons-material/SmartToy';
import VerifiedIcon from '@mui/icons-material/VerifiedUser';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory2';
import OrdersIcon from '@mui/icons-material/ReceiptLong';
import PoojaIcon from '@mui/icons-material/SelfImprovement';
import CouponIcon from '@mui/icons-material/LocalOffer';
import BundleIcon from '@mui/icons-material/Inventory';
import ChatIcon from '@mui/icons-material/Forum';
import CallIcon from '@mui/icons-material/PhoneInTalk';
import PayoutIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptIcon from '@mui/icons-material/SwapHoriz';
import InvoiceIcon from '@mui/icons-material/Description';
import GatewayIcon from '@mui/icons-material/CreditCard';
import RechargeIcon from '@mui/icons-material/AddCard';
import WarningIcon from '@mui/icons-material/ReportProblem';
import SettingsIcon from '@mui/icons-material/Tune';
import TuneAppIcon from '@mui/icons-material/PhonelinkSetup';
import VideocamIcon from '@mui/icons-material/Videocam';
import ShieldIcon from '@mui/icons-material/AdminPanelSettings';
import NotificationsIcon from '@mui/icons-material/NotificationsActive';
import GavelIcon from '@mui/icons-material/Gavel';
import TranslateIcon from '@mui/icons-material/Translate';
import HistoryIcon from '@mui/icons-material/History';
import InboxIcon from '@mui/icons-material/MarkEmailUnread';
import AssignmentIcon from '@mui/icons-material/AssignmentInd';
import RateReviewIcon from '@mui/icons-material/RateReview';
import HeatmapIcon from '@mui/icons-material/GridOn';
import InsightsIcon from '@mui/icons-material/Insights';
import FunnelIcon from '@mui/icons-material/FilterAlt';
import TimelineIcon from '@mui/icons-material/Timeline';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
// Activity feed icons by kind.
import OverviewIcon from '@mui/icons-material/Bolt';
import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../theme/ColorModeContext';
import { useActivity } from '../activity/ActivityContext';

const DRAWER = 252;
const RAIL = 68;

// Injected from package.json by Vite (see vite.config.js `define`).
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

// Grouped nav. Each group has a section label + icon (shown in rail) + items.
// `badge` on an item maps to an ActivityContext kind for the live red dot.
const GROUPS = [
  {
    section: 'Overview', icon: <OverviewIcon />,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
      { to: '/activity', label: 'Activity', icon: <NotificationsIcon />, isActivity: true },
    ],
  },
  {
    section: 'Operations', icon: <StarIcon />,
    items: [
      { to: '/astrologers', label: 'Astrologers', icon: <StarIcon /> },
      { to: '/leaderboard', label: 'Leaderboard', icon: <LeaderboardIcon /> },
      { to: '/ai-astrologers', label: 'AI Astrologers', icon: <AiIcon /> },
      { to: '/kyc', label: 'KYC Records', icon: <VerifiedIcon />, badge: 'kyc' },
      { to: '/users', label: 'Users & Wallets', icon: <PeopleIcon /> },
      { to: '/categories', label: 'Categories', icon: <CategoryIcon /> },
      { to: '/products', label: 'Products', icon: <InventoryIcon /> },
      { to: '/store-submissions', label: 'Store Submissions', icon: <InventoryIcon /> },
      { to: '/orders', label: 'Orders', icon: <OrdersIcon />, badge: ['order', 'order_support'] },
      { to: '/store-charges', label: 'Store Charges', icon: <ReceiptIcon /> },
      { to: '/pooja', label: 'Pooja', icon: <PoojaIcon /> },
      { to: '/coupons', label: 'Coupons', icon: <CouponIcon /> },
      { to: '/bundles', label: 'Bundles', icon: <BundleIcon /> },
    ],
  },
  {
    section: 'Finance', icon: <PayoutIcon />,
    items: [
      { to: '/transactions', label: 'Transactions', icon: <ReceiptIcon /> },
      { to: '/invoices', label: 'Invoices', icon: <InvoiceIcon /> },
      { to: '/payment-gateways', label: 'Payment Gateways', icon: <GatewayIcon /> },
      { to: '/recharge-templates', label: 'Recharge Packs', icon: <RechargeIcon /> },
      { to: '/withdrawals', label: 'Withdrawals', icon: <PayoutIcon />, badge: ['withdrawal', 'bank_account'] },
    ],
  },
  {
    section: 'Monitoring', icon: <ChatIcon />,
    items: [
      { to: '/monitor/chats', label: 'Live Chats', icon: <ChatIcon /> },
      { to: '/monitor/calls', label: 'Calls & Recordings', icon: <CallIcon /> },
      { to: '/ai-reminders', label: 'AI Notifications', icon: <AiIcon /> },
      { to: '/admin-feedback', label: 'Admin Feedback', icon: <RateReviewIcon /> },
      { to: '/escalations', label: 'Escalations', icon: <WarningIcon />, badge: 'escalation' },
    ],
  },
  {
    section: 'Leads', icon: <InboxIcon />,
    items: [
      { to: '/enquiries', label: 'Enquiries', icon: <InboxIcon />, badge: 'enquiry' },
      { to: '/applications', label: 'Applications', icon: <AssignmentIcon />, badge: 'astrologer_registration' },
    ],
  },
  {
    section: 'Analytics', icon: <FunnelIcon />, superOnly: true,
    items: [
      { to: '/analytics/firebase', label: 'Firebase GA', icon: <InsightsIcon /> },
      { to: '/analytics/heatmap', label: 'Heatmap', icon: <HeatmapIcon /> },
      { to: '/analytics/funnel', label: 'Funnel', icon: <FunnelIcon /> },
      { to: '/analytics/form-funnel', label: 'Form Funnel', icon: <TimelineIcon /> },
    ],
  },
  {
    section: 'Platform', icon: <ShieldIcon />, superOnly: true,
    items: [
      { to: '/notifications', label: 'Notifications', icon: <NotificationsIcon /> },
      { to: '/legal', label: 'Legal & Policies', icon: <GavelIcon /> },
      { to: '/danger-prompts', label: 'Danger Prompts', icon: <WarningIcon /> },
      { to: '/llm-logs', label: 'LLM Logs', icon: <AiIcon /> },
      { to: '/marketing', label: 'AI Marketing', icon: <NotificationsIcon /> },
      { to: '/translation', label: 'Translation', icon: <TranslateIcon /> },
      { to: '/app-config', label: 'App Configuration', icon: <TuneAppIcon /> },
      { to: '/agora', label: 'Agora (Video/Voice)', icon: <VideocamIcon /> },
      { to: '/vedic-astro', label: 'VedicAstro API', icon: <StarIcon /> },
      { to: '/settings', label: 'Settings', icon: <SettingsIcon /> },
      { to: '/admins', label: 'Admin Management', icon: <ShieldIcon /> },
      { to: '/audit', label: 'Audit Logs', icon: <HistoryIcon /> },
    ],
  },
];

const KIND_ICON = {
  order: <OrdersIcon fontSize="small" />,
  withdrawal: <PayoutIcon fontSize="small" />,
  escalation: <WarningIcon fontSize="small" />,
  enquiry: <InboxIcon fontSize="small" />,
  support: <ChatIcon fontSize="small" />,
  kyc: <VerifiedIcon fontSize="small" />,
  astrologer_registration: <AssignmentIcon fontSize="small" />,
};
const KIND_ROUTE = {
  order: '/orders', withdrawal: '/withdrawals', escalation: '/escalations',
  enquiry: '/enquiries', support: '/escalations', kyc: '/kyc',
  astrologer_registration: '/applications',
};

const RAIL_KEY = 'admin.sidebar.rail';
const OPEN_KEY = 'admin.sidebar.openGroups';

function relTime(iso) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return ''; }
}

export default function AdminLayout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { counts, feed, unread, clear, markAllRead, markRead } = useActivity();
  const { palette } = useTheme();
  const b = palette.brand;
  const { mode, toggle } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState(null); // account menu
  const [bellAnchor, setBellAnchor] = useState(null); // notifications popover

  // Collapsed icon-rail (desktop only). Persisted.
  const [rail, setRail] = useState(() => localStorage.getItem(RAIL_KEY) === '1');
  const toggleRail = () => setRail((r) => { localStorage.setItem(RAIL_KEY, r ? '0' : '1'); return !r; });

  const groups = useMemo(() => GROUPS.filter((g) => !g.superOnly || isSuperAdmin), [isSuperAdmin]);

  // Which groups are expanded. Default: the group containing the active route.
  const activeGroup = groups.find((g) => g.items.some((it) => location.pathname.startsWith(it.to)))?.section;
  const [openGroups, setOpenGroups] = useState(() => {
    const saved = JSON.parse(localStorage.getItem(OPEN_KEY) || 'null');
    return saved || {};
  });
  const isOpen = (section) => (section in openGroups ? openGroups[section] : section === activeGroup);
  const toggleGroup = (section) =>
    setOpenGroups((o) => {
      const next = { ...o, [section]: !isOpen(section) };
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      return next;
    });

  // Rail flyout (hover a group icon → show its items in a Popper).
  const [flyout, setFlyout] = useState(null); // { el, group }

  const ink = { bg: '#0E0F13', bg2: '#16171C', text: '#ECECEE', dim: '#8A8D96', border: '#23252E' };
  const width = isMobile ? DRAWER : (rail ? RAIL : DRAWER);

  const go = useCallback((to) => { navigate(to); setMobileOpen(false); setFlyout(null); }, [navigate]);

  // Sum a nav item's badge count. `badge` may be a kind string or an array of
  // kinds (e.g. Orders shows new orders + new order-support requests).
  const countFor = (item) => {
    if (item.isActivity) return unread;
    if (!item.badge) return 0;
    const kinds = Array.isArray(item.badge) ? item.badge : [item.badge];
    return kinds.reduce((n, k) => n + (counts[k] || 0), 0);
  };

  // A single nav item row (badge-aware). `dense` for flyout rows.
  const NavItem = ({ item }) => {
    const selected = !item.isActivity && location.pathname.startsWith(item.to);
    const badgeCount = countFor(item);
    // The "Activity" entry opens the notifications popover instead of navigating.
    const onClick = item.isActivity ? (e) => { setBellAnchor(e.currentTarget); setFlyout(null); } : () => go(item.to);
    return (
      <ListItemButton
        selected={selected}
        onClick={onClick}
        sx={{
          borderRadius: 2, mb: 0.25, py: 0.85, color: ink.dim, position: 'relative',
          '&.Mui-selected': {
            background: alpha(b.RED.main, 0.14), color: '#fff',
            '&::before': { content: '""', position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: b.RED.main },
            '&:hover': { background: alpha(b.RED.main, 0.2) },
          },
          '&.Mui-selected .MuiListItemIcon-root': { color: b.RED.soft },
          '&:hover': { background: alpha('#fff', 0.05) },
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 34, '& svg': { fontSize: 19 } }}>
          <Badge color="error" badgeContent={badgeCount} max={99} overlap="circular"
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            {item.icon}
          </Badge>
        </ListItemIcon>
        <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
      </ListItemButton>
    );
  };

  // Roll-up count for a group (sum of its items' badges) — shown on the rail icon.
  const groupCount = (g) => g.items.reduce((n, it) => n + countFor(it), 0);

  // ── Expanded sidebar body ──
  const expandedNav = (
    <List sx={{ px: 1.25, py: 1, flex: 1, overflowY: 'auto' }}>
      {groups.map((g) => (
        <Box key={g.section}>
          <ListItemButton onClick={() => toggleGroup(g.section)}
            sx={{ borderRadius: 2, py: 0.6, mt: 0.75, color: ink.dim, '&:hover': { background: alpha('#fff', 0.05) } }}>
            <Typography variant="overline" sx={{ flex: 1, color: ink.dim, fontSize: 9.5, letterSpacing: 1.4 }}>{g.section}</Typography>
            <Badge color="error" variant="dot" invisible={groupCount(g) === 0} sx={{ mr: 1 }} />
            {isOpen(g.section) ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ChevronRightIcon sx={{ fontSize: 18 }} />}
          </ListItemButton>
          <Collapse in={isOpen(g.section)} timeout="auto" unmountOnExit>
            {g.items.map((item) => <NavItem key={item.to} item={item} />)}
          </Collapse>
        </Box>
      ))}
    </List>
  );

  // ── Rail (icon-only) body with hover flyouts ──
  const railNav = (
    <List sx={{ px: 0.75, py: 1, flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      {groups.map((g) => {
        const railActive = g.items.some((it) => location.pathname.startsWith(it.to));
        return (
          <ListItemButton key={g.section}
            onMouseEnter={(e) => setFlyout({ el: e.currentTarget, group: g })}
            onClick={(e) => setFlyout({ el: e.currentTarget, group: g })}
            selected={railActive}
            sx={{
              borderRadius: 2, mb: 0.5, justifyContent: 'center', color: ink.dim,
              '&.Mui-selected': { background: alpha(b.RED.main, 0.14), color: '#fff' },
              '&:hover': { background: alpha('#fff', 0.05) },
            }}
          >
            <Badge color="error" variant="dot" invisible={groupCount(g) === 0} overlap="circular">
              <Box sx={{ display: 'grid', placeItems: 'center', '& svg': { fontSize: 21 } }}>{g.icon}</Box>
            </Badge>
          </ListItemButton>
        );
      })}
    </List>
  );

  const brandHeader = (
    <Box sx={{ px: rail && !isMobile ? 1 : 2.5, py: 2.25, display: 'flex', alignItems: 'center', gap: 1.25, justifyContent: rail && !isMobile ? 'center' : 'flex-start' }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 2, background: ink.bg2, border: `1px solid ${ink.border}`, display: 'grid', placeItems: 'center', boxShadow: `0 4px 14px -6px ${alpha(b.RED.main, 0.7)}`, flexShrink: 0 }}>
        <Typography sx={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 19, lineHeight: 1, letterSpacing: '-0.04em' }}>
          <Box component="span" sx={{ color: '#fff' }}>r</Box><Box component="span" sx={{ color: b.RED.main }}>g</Box>
        </Typography>
      </Box>
      {(!rail || isMobile) && (
        <Box>
          <Typography sx={{ fontFamily: 'Fraunces, serif', fontWeight: 700, lineHeight: 1, fontSize: 16.5, color: ink.text }}>Rudraganga</Typography>
          <Typography variant="caption" sx={{ color: b.RED.soft, letterSpacing: 1.5, fontSize: 9.5, fontWeight: 600 }}>ADMIN CONSOLE</Typography>
        </Box>
      )}
    </Box>
  );

  const drawer = (
    <Box sx={{ height: '100%', background: `linear-gradient(180deg, ${ink.bg2} 0%, ${ink.bg} 100%)`, display: 'flex', flexDirection: 'column' }}>
      {brandHeader}
      <Divider sx={{ borderColor: ink.border }} />
      {rail && !isMobile ? railNav : expandedNav}
      {/* Footer: collapse toggle + user chip */}
      <Box sx={{ p: 1.25 }}>
        {!isMobile && (
          <Tooltip title={rail ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <ListItemButton onClick={toggleRail}
              sx={{ borderRadius: 2, mb: 1, justifyContent: rail ? 'center' : 'flex-start', color: ink.dim, '&:hover': { background: alpha('#fff', 0.05) } }}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: rail ? 0 : 34, '& svg': { fontSize: 20 } }}>
                {rail ? <MenuIcon /> : <MenuOpenIcon />}
              </ListItemIcon>
              {!rail && <ListItemText primary="Collapse" primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />}
            </ListItemButton>
          </Tooltip>
        )}
        <Box sx={{ p: rail && !isMobile ? 0.75 : 1.25, borderRadius: 2.5, background: alpha('#fff', 0.04), border: `1px solid ${ink.border}`, display: 'flex', alignItems: 'center', gap: 1.25, justifyContent: rail && !isMobile ? 'center' : 'flex-start' }}>
          <Avatar sx={{ background: b.gradients.red, width: 34, height: 34, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{(user?.name || 'A')[0]}</Avatar>
          {(!rail || isMobile) && (
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: ink.text }}>{user?.name || 'Admin'}</Typography>
              <Chip size="small" label={isSuperAdmin ? 'Super Admin' : 'Admin'}
                sx={{ height: 17, fontSize: 9.5, background: alpha(b.RED.main, 0.18), color: b.RED.soft }} />
            </Box>
          )}
        </Box>

        {/* App version + maker credit (DevifAI → website) */}
        {(!rail || isMobile) ? (
          <Box sx={{ mt: 1.25, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 10.5, color: ink.dim }}>v{APP_VERSION}</Typography>
            <Typography sx={{ fontSize: 10.5, color: ink.dim }}>
              Made by{' '}
              <Box component="a" href="https://www.devifai.in" target="_blank" rel="noopener noreferrer"
                sx={{ color: b.RED.soft, fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                DevifAI
              </Box>
              {' '}with ❤️
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ mt: 1, fontSize: 9.5, color: ink.dim, textAlign: 'center' }}>v{APP_VERSION}</Typography>
        )}
      </Box>
    </Box>
  );

  const openBell = (e) => setBellAnchor(e.currentTarget);
  const onFeedItem = (item) => {
    markRead(item._id);
    const route = KIND_ROUTE[item.kind];
    if (route) { clear(item.kind); navigate(route); }
    setBellAnchor(null);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0}
        sx={{ width: { md: `calc(100% - ${width}px)` }, ml: { md: `${width}px` }, transition: 'width .2s, margin .2s', background: alpha(b.ground, 0.7), backdropFilter: 'blur(12px)', borderBottom: `1px solid ${b.border}`, color: b.text }}>
        <Toolbar variant="dense" sx={{ minHeight: 60 }}>
          {isMobile && <IconButton onClick={() => setMobileOpen(true)} sx={{ mr: 1, color: b.text }}><MenuIcon /></IconButton>}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Notifications">
            <IconButton onClick={openBell} sx={{ color: b.textDim, mr: 0.5 }}>
              <Badge color="error" badgeContent={unread} max={99}>
                {unread > 0 ? <NotificationsIcon fontSize="small" /> : <NotificationsNoneIcon fontSize="small" />}
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={toggle} sx={{ color: b.textDim, mr: 0.5 }}>{mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}</IconButton>
          </Tooltip>
          <Tooltip title="Account">
            <IconButton onClick={(e) => setAnchor(e.currentTarget)}>
              <Avatar sx={{ background: b.gradients.red, width: 34, height: 34, fontWeight: 700, fontSize: 14 }}>{(user?.name || 'A')[0]}</Avatar>
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
            PaperProps={{ sx: { background: b.surface2, border: `1px solid ${b.border}`, mt: 1, minWidth: 180 } }}>
            <MenuItem disabled sx={{ opacity: 0.7, fontSize: 13 }}>{user?.phone}</MenuItem>
            <Divider sx={{ borderColor: b.border }} />
            <MenuItem onClick={async () => { await logout(); navigate('/login'); }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Notifications popover (topbar bell + sidebar Activity both open this) */}
      <Popover open={!!bellAnchor} anchorEl={bellAnchor} onClose={() => setBellAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 340, maxHeight: 440, background: b.surface, border: `1px solid ${b.border}`, mt: 1 } }}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${b.borderSoft}` }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Activity</Typography>
          {feed.length > 0 && (
            <Tooltip title="Mark all read">
              <IconButton size="small" onClick={markAllRead} sx={{ color: b.textDim }}><DoneAllIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>
        {feed.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: b.textFaint }}>
            <NotificationsNoneIcon sx={{ fontSize: 32, mb: 1, opacity: 0.6 }} />
            <Typography variant="body2">No new activity</Typography>
          </Box>
        ) : (
          <List dense sx={{ py: 0 }}>
            {feed.map((item) => (
              <ListItemButton key={item._id} onClick={() => onFeedItem(item)}
                sx={{ py: 1, borderBottom: `1px solid ${b.borderSoft}`, background: item.read ? 'transparent' : alpha(b.RED.main, 0.06) }}>
                <ListItemIcon sx={{ minWidth: 34, color: b.RED.soft }}>{KIND_ICON[item.kind] || <NotificationsIcon fontSize="small" />}</ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={relTime(item.at)}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: item.read ? 500 : 700, noWrap: true }}
                  secondaryTypographyProps={{ fontSize: 11, color: b.textFaint }}
                />
                {!item.read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: b.RED.main, ml: 1 }} />}
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>

      {/* Rail hover flyout: a group's items pop out beside the rail */}
      <Popper open={!!flyout && rail && !isMobile} anchorEl={flyout?.el} placement="right-start" style={{ zIndex: 1300 }}>
        <Paper onMouseLeave={() => setFlyout(null)}
          sx={{ ml: 1, minWidth: 210, p: 1, background: ink.bg2, border: `1px solid ${ink.border}`, borderRadius: 2 }}>
          <Typography variant="overline" sx={{ px: 1, color: ink.dim, fontSize: 9.5, letterSpacing: 1.4 }}>{flyout?.group.section}</Typography>
          {flyout?.group.items.map((item) => <NavItem key={item.to} item={item} />)}
        </Paper>
      </Popper>

      <Box component="nav" sx={{ width: { md: width }, flexShrink: { md: 0 }, transition: 'width .2s' }}>
        <Drawer variant={isMobile ? 'temporary' : 'permanent'} open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: isMobile ? DRAWER : width, border: 'none', boxSizing: 'border-box', transition: 'width .2s', overflowX: 'hidden' } }}>
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${width}px)` }, transition: 'width .2s', p: { xs: 2, md: 2.5 }, pt: { xs: 9, md: 10 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
