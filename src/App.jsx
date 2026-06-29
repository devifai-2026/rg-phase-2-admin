import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RequireSuperAdmin } from './auth/guards';
import AdminLayout from './layout/AdminLayout';
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';
import Dashboard from './pages/Dashboard';
import Astrologers from './pages/Astrologers';
import AstrologerDetail from './pages/AstrologerDetail';
import AstrologerEditor from './pages/AstrologerEditor';
import ProductEditor from './pages/ProductEditor';
import BundleEditor from './pages/BundleEditor';
import KycQueue from './pages/KycQueue';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Categories from './pages/Categories';
import Products from './pages/Products';
import StoreSubmissions from './pages/StoreSubmissions';
import StoreCharges from './pages/StoreCharges';
import Orders from './pages/Orders';
import Transactions from './pages/Transactions';
import Invoices from './pages/Invoices';
import PaymentGateways from './pages/PaymentGateways';
import AgoraSettings from './pages/AgoraSettings';
import VedicAstroSettings from './pages/VedicAstroSettings';
import Coupons from './pages/Coupons';
import Bundles from './pages/Bundles';
import Leaderboard from './pages/Leaderboard';
import AiPersonas from './pages/AiPersonas';
import Pooja from './pages/Pooja';
import RechargeTemplates from './pages/RechargeTemplates';
import ChatMonitor from './pages/ChatMonitor';
import CallMonitor from './pages/CallMonitor';
import Withdrawals from './pages/Withdrawals';
import Escalations from './pages/Escalations';
import Settings from './pages/Settings';
import AppConfiguration from './pages/AppConfiguration';
import AdminManagement from './pages/AdminManagement';
import AuditLogs from './pages/AuditLogs';
import Enquiries from './pages/Enquiries';
import Applications from './pages/Applications';
import Heatmap from './pages/Heatmap';
import Funnel from './pages/Funnel';
import SignupFunnel from './pages/SignupFunnel';
import AnalyticsGA from './pages/AnalyticsGA';
import Notifications from './pages/Notifications';
import LegalContent from './pages/LegalContent';
import DangerPrompts from './pages/DangerPrompts';
import AiReminders from './pages/AiReminders';
import AdminFeedback from './pages/AdminFeedback';
import LlmLogs from './pages/LlmLogs';
import Marketing from './pages/Marketing';
import Translation from './pages/Translation';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<Forbidden />} />

      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Operational — admin + super_admin */}
        <Route path="/astrologers" element={<Astrologers />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/ai-astrologers" element={<AiPersonas />} />
        <Route path="/astrologers/new" element={<AstrologerEditor />} />
        <Route path="/astrologers/:id/edit" element={<AstrologerEditor />} />
        <Route path="/astrologers/:id" element={<AstrologerDetail />} />
        <Route path="/kyc" element={<KycQueue />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/products" element={<Products />} />
        <Route path="/store-submissions" element={<StoreSubmissions />} />
        <Route path="/products/new" element={<ProductEditor />} />
        <Route path="/products/:id/edit" element={<ProductEditor />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/store-charges" element={<StoreCharges />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/bundles" element={<Bundles />} />
        <Route path="/pooja" element={<Pooja />} />
        <Route path="/recharge-templates" element={<RechargeTemplates />} />
        <Route path="/bundles/new" element={<BundleEditor />} />
        <Route path="/bundles/:id/edit" element={<BundleEditor />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payment-gateways" element={<PaymentGateways />} />
        <Route path="/agora" element={<AgoraSettings />} />
        <Route path="/vedic-astro" element={<RequireSuperAdmin><VedicAstroSettings /></RequireSuperAdmin>} />
        <Route path="/monitor/chats" element={<ChatMonitor />} />
        <Route path="/monitor/calls" element={<CallMonitor />} />
        <Route path="/ai-reminders" element={<AiReminders />} />
        <Route path="/admin-feedback" element={<AdminFeedback />} />
        <Route path="/llm-logs" element={<RequireSuperAdmin><LlmLogs /></RequireSuperAdmin>} />
        <Route path="/marketing" element={<RequireSuperAdmin><Marketing /></RequireSuperAdmin>} />
        <Route path="/translation" element={<RequireSuperAdmin><Translation /></RequireSuperAdmin>} />
        <Route path="/withdrawals" element={<Withdrawals />} />
        <Route path="/escalations" element={<Escalations />} />
        <Route path="/enquiries" element={<Enquiries />} />
        <Route path="/applications" element={<Applications />} />

        {/* Super-admin only */}
        <Route path="/notifications" element={<RequireSuperAdmin><Notifications /></RequireSuperAdmin>} />
        <Route path="/legal" element={<RequireSuperAdmin><LegalContent /></RequireSuperAdmin>} />
        <Route path="/danger-prompts" element={<RequireSuperAdmin><DangerPrompts /></RequireSuperAdmin>} />
        <Route path="/settings" element={<RequireSuperAdmin><Settings /></RequireSuperAdmin>} />
        <Route path="/app-config" element={<RequireSuperAdmin><AppConfiguration /></RequireSuperAdmin>} />
        <Route path="/admins" element={<RequireSuperAdmin><AdminManagement /></RequireSuperAdmin>} />
        <Route path="/audit" element={<RequireSuperAdmin><AuditLogs /></RequireSuperAdmin>} />
        <Route path="/analytics/firebase" element={<RequireSuperAdmin><AnalyticsGA /></RequireSuperAdmin>} />
        <Route path="/analytics/heatmap" element={<RequireSuperAdmin><Heatmap /></RequireSuperAdmin>} />
        <Route path="/analytics/funnel" element={<RequireSuperAdmin><Funnel /></RequireSuperAdmin>} />
        <Route path="/analytics/form-funnel" element={<RequireSuperAdmin><SignupFunnel /></RequireSuperAdmin>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
