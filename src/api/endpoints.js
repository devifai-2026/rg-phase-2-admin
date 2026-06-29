import api from './client';

// Typed-ish API surface so components never hand-write URLs.
export const AuthAPI = {
  requestOtp: (phone) => api.post('/auth/request-otp', { phone }),
  verifyOtp: (phone, code) => api.post('/auth/verify-otp', { phone, code }),
  me: () => api.get('/auth/me'),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const AdminAPI = {
  dashboard: (params) => api.get('/admin/dashboard', { params }),
  lowStock: (threshold = 10) => api.get('/admin/low-stock', { params: { threshold } }),
  leaderboard: (days = 30) => api.get('/admin/leaderboard', { params: { days } }),

  // Astrologer storefront submissions (products + poojas) review.
  storeSubmissions: (status = 'pending') => api.get('/admin/store/submissions', { params: { status } }),
  approveStoreItem: (kind, id, commissionPercent) => api.patch(`/admin/store/${kind}/${id}/approve`, { commissionPercent }),
  rejectStoreItem: (kind, id, adminNote) => api.patch(`/admin/store/${kind}/${id}/reject`, { adminNote }),
  editStoreItem: (kind, id, body) => api.patch(`/admin/store/${kind}/${id}`, body),

  // Pooja catalog + bookings
  listPoojaTypes: () => api.get('/admin/pooja-types'),
  createPoojaType: (body) => api.post('/admin/pooja-types', body),
  updatePoojaType: (id, body) => api.put(`/admin/pooja-types/${id}`, body),
  deletePoojaType: (id) => api.delete(`/admin/pooja-types/${id}`),
  listPoojaCategories: () => api.get('/admin/pooja-categories'),
  createPoojaCategory: (body) => api.post('/admin/pooja-categories', body),
  updatePoojaCategory: (id, body) => api.put(`/admin/pooja-categories/${id}`, body),
  deletePoojaCategory: (id) => api.delete(`/admin/pooja-categories/${id}`),
  // Payment gateway config
  getPaymentGateway: () => api.get('/admin/payment-gateway'),
  requestPaymentGatewayOtp: () => api.post('/admin/payment-gateway/request-otp'),
  updatePaymentGateway: (body) => api.put('/admin/payment-gateway', body),
  // Firebase / GA4 analytics (native charts via the GA4 Data API)
  gaAnalytics: (params) => api.get('/admin/analytics/ga', { params }),
  // AI reminders + recaps (oversight) + chat-thread preview for the modal
  listReminders: (params) => api.get('/admin/ai/reminders', { params }),
  listRecaps: (params) => api.get('/admin/ai/recaps', { params }),
  listAiNotifications: (params) => api.get('/admin/ai/notifications', { params }),
  listAiLogs: (params) => api.get('/admin/ai/logs', { params }),
  // Admin Feedback — astrologer-authored post-service / post-live feedback.
  listServiceFeedback: (params) => api.get('/admin/service-feedback', { params }),
  // Translation (GCP) — full run + status
  translationStatus: () => api.get('/admin/translation/status'),
  translationRuns: (limit = 20) => api.get('/admin/translation/runs', { params: { limit } }),
  runTranslation: () => api.post('/admin/translation/run'),
  // AI Marketing Agent
  getMarketingConfig: () => api.get('/admin/marketing/config'),
  updateMarketingConfig: (body) => api.put('/admin/marketing/config', body),
  generateMarketing: (total) => api.post('/admin/marketing/generate', { total }),
  reviewMarketing: (body) => api.post('/admin/marketing/review', body),
  listMarketing: (params) => api.get('/admin/marketing', { params }),
  runMarketingNow: () => api.post('/admin/marketing/run-now'),
  sessionMessages: (sessionId) => api.get(`/admin/monitor/sessions/${sessionId}/messages`),
  // Danger Prompts (LLM SYSTEM prompts; editing is OTP-gated to a guardian number)
  listPrompts: () => api.get('/admin/prompts'),
  requestPromptOtp: () => api.post('/admin/prompts/request-otp'),
  updatePrompt: (body) => api.put('/admin/prompts', body),
  // Agora credentials (App ID + REST key/secret; secret encrypted at rest)
  getAgora: () => api.get('/admin/agora'),
  requestAgoraOtp: () => api.post('/admin/agora/request-otp'),
  updateAgora: (body) => api.put('/admin/agora', body),
  revealAgoraSecret: (otp) => api.post('/admin/agora/reveal', { otp }),
  // VedicAstroAPI credentials (API key encrypted at rest; save + reveal OTP-gated)
  getVedicAstro: () => api.get('/admin/vedic-astro'),
  requestVedicAstroOtp: () => api.post('/admin/vedic-astro/request-otp'),
  updateVedicAstro: (body) => api.put('/admin/vedic-astro', body),
  revealVedicAstroSecret: (otp) => api.post('/admin/vedic-astro/reveal', { otp }),
  // Invoices: templates + generated invoices
  listInvoiceTemplates: () => api.get('/admin/invoice-templates'),
  createInvoiceTemplate: (body) => api.post('/admin/invoice-templates', body),
  updateInvoiceTemplate: (id, body) => api.put(`/admin/invoice-templates/${id}`, body),
  deleteInvoiceTemplate: (id) => api.delete(`/admin/invoice-templates/${id}`),
  listInvoices: (params) => api.get('/admin/invoices', { params }),
  regenerateInvoice: (id) => api.post(`/admin/invoices/${id}/regenerate`),
  // Preview a template → returns the sample invoice PDF as a blob.
  previewInvoiceTemplate: (body) => api.post('/admin/invoice-templates/preview', body, { responseType: 'blob' }),
  listPoojaBookings: (params) => api.get('/admin/pooja-bookings', { params }),
  updatePoojaBooking: (id, body) => api.patch(`/admin/pooja-bookings/${id}`, body),

  // Recharge templates (app "Add money" packs)
  listRechargeTemplates: () => api.get('/admin/recharge-templates'),
  createRechargeTemplate: (body) => api.post('/admin/recharge-templates', body),
  updateRechargeTemplate: (id, body) => api.put(`/admin/recharge-templates/${id}`, body),
  deleteRechargeTemplate: (id) => api.delete(`/admin/recharge-templates/${id}`),

  // AI personas
  listPersonas: () => api.get('/admin/ai-personas'),
  createPersona: (body) => api.post('/admin/ai-personas', body),
  updatePersona: (id, body) => api.put(`/admin/ai-personas/${id}`, body),
  deletePersona: (id) => api.delete(`/admin/ai-personas/${id}`),

  // Astrologers
  listAstrologers: (params) => api.get('/admin/astrologers', { params }),
  getAstrologer: (id) => api.get(`/admin/astrologers/${id}`),
  // Verify an astrologer's phone via OTP (dev 123456) before create / phone change.
  requestAstrologerOtp: (phone) => api.post('/admin/astrologers/request-otp', { phone }),
  createAstrologer: (body) => api.post('/admin/astrologers', body),
  updateAstrologer: (id, body) => api.put(`/admin/astrologers/${id}`, body),
  deleteAstrologer: (id) => api.delete(`/admin/astrologers/${id}`),
  deleteApplication: (id) => api.delete(`/admin/astrologers/${id}/application`),
  astrologerCallLogs: (id, params) => api.get(`/admin/astrologers/${id}/call-logs`, { params }),

  // Users + recharge
  listUsers: (params) => api.get('/admin/users', { params }),
  requestUserOtp: (phone) => api.post('/admin/users/request-otp', { phone }),
  createUser: (body) => api.post('/admin/users', body),
  userDetail: (id) => api.get(`/admin/users/${id}`),
  blockUser: (id, blocked) => api.patch(`/admin/users/${id}/block`, { blocked }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  recharge: (body) => api.post('/admin/users/recharge', body),
  astrologerFull: (id) => api.get(`/admin/astrologers/${id}/full`),
  addAstrologerReview: (profileId, body) => api.post(`/admin/astrologers/${profileId}/reviews`, body),
  deleteReview: (reviewId) => api.delete(`/admin/reviews/${reviewId}`),
  // Public storefront (profile + active AI layoutSpec + products + poojas) — read-only,
  // used to render the seeker-facing storefront preview in a phone mockup. :id = AstrologerProfile id.
  astrologerStorefront: (profileId) => api.get(`/astrologers/${profileId}/storefront`),

  // Transactions ledger
  listTransactions: (params) => api.get('/admin/transactions', { params }),
  transactionsSummary: (params) => api.get('/admin/transactions/summary', { params }),

  // Commerce
  createCategory: (body) => api.post('/admin/categories', body),
  updateCategory: (id, body) => api.put(`/admin/categories/${id}`, body),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  createProduct: (body) => api.post('/admin/products', body),
  updateProduct: (id, body) => api.put(`/admin/products/${id}`, body),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),

  // Store-wide charges (delivery / GST / shipping / platform)
  getStoreCharges: () => api.get('/store-charges'),
  updateStoreCharges: (body) => api.put('/admin/store-charges', body),

  // Orders + invoices
  listOrders: (params) => api.get('/admin/orders', { params }),
  ordersAnalytics: (params) => api.get('/admin/orders-analytics', { params }),
  updateOrderStatus: (id, status) => api.patch(`/admin/orders/${id}/status`, { status }),
  orderInvoice: (id) => api.get(`/admin/orders/${id}/invoice`),
  // Order support ("Need help" requests)
  listOrderSupport: (params) => api.get('/admin/order-support', { params }),
  setOrderSupportStatus: (id, status) => api.patch(`/admin/order-support/${id}/status`, { status }),

  // Offers: coupons + bundles
  listCoupons: () => api.get('/admin/coupons'),
  createCoupon: (body) => api.post('/admin/coupons', body),
  updateCoupon: (id, body) => api.put(`/admin/coupons/${id}`, body),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  listBundles: () => api.get('/admin/bundles'),
  createBundle: (body) => api.post('/admin/bundles', body),
  updateBundle: (id, body) => api.put(`/admin/bundles/${id}`, body),
  deleteBundle: (id) => api.delete(`/admin/bundles/${id}`),

  // Monitors
  liveChats: () => api.get('/admin/monitor/chats'),
  activeCalls: () => api.get('/admin/monitor/calls'),
  callLogs: (params) => api.get('/admin/monitor/call-logs', { params }),
  // Chat history + analytics (params: user, astrologer, q, from, to, page, limit)
  chatLogs: (params) => api.get('/admin/monitor/chat-logs', { params }),
  chatAnalytics: (params) => api.get('/admin/monitor/chat-analytics', { params }),
  sessionMessages: (sessionId) => api.get(`/admin/monitor/sessions/${sessionId}/messages`),

  // Withdrawals
  listWithdrawals: (params) => api.get('/admin/withdrawals', { params }),
  approveWithdrawal: (id, note) => api.patch(`/admin/withdrawals/${id}/approve`, { note }),
  rejectWithdrawal: (id, note) => api.patch(`/admin/withdrawals/${id}/reject`, { note }),

  // Escalations + support + content
  listEscalations: (params) => api.get('/admin/escalations', { params }),
  resolveEscalation: (id, note) => api.patch(`/admin/escalations/${id}/resolve`, { note }),
  listTickets: (params) => api.get('/admin/support/tickets', { params }),
  replyTicket: (id, message) => api.post(`/admin/support/tickets/${id}/reply`, { message }),
  setTicketStatus: (id, status) => api.patch(`/admin/support/tickets/${id}/status`, { status }),

  // App Configuration (super-admin): promo banners, Home videos/lessons, toggles
  getAppConfig: () => api.get('/admin/app-config'),
  updateAppConfig: (body) => api.put('/admin/app-config', body),
  listBanners: (params) => api.get('/admin/banners', { params }),
  createBanner: (body) => api.post('/admin/banners', body),
  updateBanner: (id, body) => api.put(`/admin/banners/${id}`, body),
  reorderBanners: (ids) => api.put('/admin/banners/reorder', { ids }),
  deleteBanner: (id) => api.delete(`/admin/banners/${id}`),
  listVideos: (params) => api.get('/admin/videos', { params }),
  createVideo: (body) => api.post('/admin/videos', body),
  updateVideo: (id, body) => api.put(`/admin/videos/${id}`, body),
  deleteVideo: (id) => api.delete(`/admin/videos/${id}`),

  // Super-admin only
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (body) => api.put('/admin/settings', body),
  listAdmins: () => api.get('/admin/admins'),
  requestAdminOtp: (phone) => api.post('/admin/admins/request-otp', { phone }),
  createAdmin: (body) => api.post('/admin/admins', body),
  deleteAdmin: (id) => api.delete(`/admin/admins/${id}`),
  auditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// Enquiries (contact-us submissions) — admin + super_admin.
export const EnquiryAPI = {
  list: (params) => api.get('/admin/enquiries', { params }),
  getOne: (id) => api.get(`/admin/enquiries/${id}`),
  update: (id, body) => api.patch(`/admin/enquiries/${id}`, body),
};

// Site content / legal docs (Terms, Privacy…) — super_admin only.
export const ContentAPI = {
  list: () => api.get('/admin/content'),                  // all docs (published + drafts)
  get: (key) => api.get(`/content/${key}`),               // public read of one doc
  upsert: (key, body) => api.put(`/admin/content/${key}`, body), // { title, body, isPublished }
};

// Analytics (heatmap + funnels) — super_admin only.
export const SuperAdminAPI = {
  heatmap: (params) => api.get('/superadmin/heatmap', { params }),
  funnel: (params) => api.get('/superadmin/funnel', { params }),
  signupFunnel: (params) => api.get('/superadmin/signup-funnel', { params }),
  visitor: (anonId) => api.get(`/superadmin/visitor/${anonId}`),
};

// Notifications (templates, bulk broadcasts, logs) — super_admin only.
export const NotificationsAPI = {
  // Templates
  listTemplates: () => api.get('/superadmin/notifications/templates'),
  updateTemplate: (event, body) => api.put(`/superadmin/notifications/templates/${event}`, body),
  // Bulk / segment / manual broadcasts
  estimate: (body) => api.post('/superadmin/notifications/estimate', body),
  send: (body) => api.post('/superadmin/notifications/broadcast', body),
  retry: (id) => api.post(`/superadmin/notifications/broadcast/${id}/retry`),
  // Logs (params: page, limit, status, audience, channel, source, q, from, to)
  log: (params) => api.get('/superadmin/notifications/log', { params }),
  logStats: (params) => api.get('/superadmin/notifications/log/stats', { params }),
  // Delete a single log, or clear logs matching the current filters
  // (params: status, audience, appScope, channel, source, q, from, to;
  //  pass confirm:'all' to clear everything when no filters are set).
  removeLog: (id) => api.delete(`/superadmin/notifications/log/${id}`),
  clearLogs: (params) => api.delete('/superadmin/notifications/log', { params }),
  // Reuse the admin user list for the "specific user" picker (role = user|astrologer).
  searchUsers: (search, role = 'user') => api.get('/admin/users', { params: { search, role, limit: 20 } }),
};

export const PublicAPI = {
  categories: () => api.get('/categories?all=true'),
  products: (params) => api.get('/products', { params: { ...params, all: true } }),
  gifts: () => api.get('/gifts', { params: { all: true } }),
  // Shared expertise catalog — Autocomplete options for the astrologer editor.
  expertise: () => api.get('/astrologers/expertise'),
  uploadImage: (formData) => api.post('/users/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
