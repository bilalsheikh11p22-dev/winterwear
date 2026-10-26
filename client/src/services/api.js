import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const getApiOrigin = () => BASE_URL.replace(/\/api\/v\d+\/?$/, '');

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Access Token and Guest Cart ID
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ww_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    let guestId = localStorage.getItem('ww_guest_id');
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      localStorage.setItem('ww_guest_id', guestId);
    }
    config.headers['x-guest-id'] = guestId;

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-refresh access token on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      localStorage.getItem('ww_access_token') &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh');
        const newToken = data.data.accessToken;
        localStorage.setItem('ww_access_token', newToken);

        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('ww_access_token');
        localStorage.removeItem('ww_user');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  registerRider: (data) => apiClient.post('/auth/register-rider', data),
  logout: () => apiClient.post('/auth/logout'),
 getMe: () => {
  const token = localStorage.getItem('ww_access_token');

  if (!token) {
    return Promise.reject(
      new Error('NOT_AUTHENTICATED')
    );
  }

  return apiClient.get('/auth/me');
},
  updateProfile: (data) => apiClient.patch('/auth/me', data),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data),
};

export const productApi = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getProductBySlug: (slug) => apiClient.get(`/products/${slug}`),
  createProduct: (data) => apiClient.post('/products', data),
  updateProduct: (id, data) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`),
  getCategories: () => apiClient.get('/categories'),
  createCategory: (data) => apiClient.post('/categories', data),
  updateCategory: (id, data) => apiClient.put(`/categories/${id}`, data),
  deleteCategory: (id) => apiClient.delete(`/categories/${id}`),
  addImage: (id, data) => apiClient.post(`/products/${id}/images`, data),
  removeImage: (id, publicId) => apiClient.delete(`/products/${id}/images/${encodeURIComponent(publicId)}`),
  reorderImages: (id, images) => apiClient.patch(`/products/${id}/images/reorder`, { images }),
  setPrimaryImage: (id, publicId) => apiClient.patch(`/products/${id}/images/${encodeURIComponent(publicId)}/primary`),
  getLatest: (params) => apiClient.get('/products/latest', { params }),
  subscribe: (id, type = 'back_in_stock') => apiClient.post(`/products/${id}/subscribe`, { type }),
  unsubscribe: (id, type = 'back_in_stock') => apiClient.delete(`/products/${id}/subscribe`, { params: { type } }),
  mySubscriptions: () => apiClient.get('/products/subscriptions/mine'),
};

export const inventoryApi = {
  getDashboard: () => apiClient.get('/inventory/dashboard'),
  listInventory: (params) => apiClient.get('/inventory', { params }),
  adjustStock: (data) => apiClient.post('/inventory/adjust', data),
  getStockMovements: (params) => apiClient.get('/inventory/movements', { params }),
  listWarehouses: () => apiClient.get('/inventory/warehouses'),
  createWarehouse: (data) => apiClient.post('/inventory/warehouses', data),
  updateWarehouse: (id, data) => apiClient.patch(`/inventory/warehouses/${id}`, data),
};

export const riderPortalApi = {
  getMyDeliveries: (params) => apiClient.get('/riders/deliveries', { params }),
  pickup: (assignmentId) => apiClient.post(`/riders/deliveries/${assignmentId}/pickup`),
  drop: (assignmentId, data) => apiClient.post(`/riders/deliveries/${assignmentId}/drop`, data),
  fail: (assignmentId, data) => apiClient.post(`/riders/deliveries/${assignmentId}/fail`, data),
  updateLocation: (lat, lng) => apiClient.patch('/riders/location', { lat, lng }),
  updateDeliveryStatus: (assignmentId, data) => apiClient.patch(`/riders/deliveries/${assignmentId}/status`, data),
  submitProof: (assignmentId, data) => apiClient.post(`/riders/deliveries/${assignmentId}/proof`, data),
  getSummary: () => apiClient.get('/riders/deliveries/summary'),
};

export const notificationApi = {
  list: (params) => apiClient.get('/notifications', { params }),
  unreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: (filter) => apiClient.patch('/notifications/read-all', filter && filter !== 'all' ? { filter } : {}),
  dismiss: (id) => apiClient.delete(`/notifications/${id}`),
  click: (id) => apiClient.post(`/notifications/${id}/click`),
  getPreferences: () => apiClient.get('/notifications/preferences'),
  updatePreferences: (patchBody) => apiClient.patch('/notifications/preferences', patchBody),
};

export const adminNotificationApi = {
  metrics: (days = 30) => apiClient.get('/admin/notifications/metrics', { params: { days } }),
  activity: (params) => apiClient.get('/admin/notifications/activity', { params }),
  failedDeliveries: () => apiClient.get('/admin/notifications/failed-deliveries'),
  retryDelivery: (notificationId) => apiClient.post(`/admin/notifications/deliveries/${notificationId}/retry`),
  events: (status) => apiClient.get('/admin/notifications/events', { params: status ? { status } : {} }),
  retryEvent: (id) => apiClient.post(`/admin/notifications/events/${id}/retry`),
  listCampaigns: () => apiClient.get('/admin/notifications/campaigns'),
  getCampaign: (id) => apiClient.get(`/admin/notifications/campaigns/${id}`),
  createCampaign: (body) => apiClient.post('/admin/notifications/campaigns', body),
  previewCampaign: (id) => apiClient.get(`/admin/notifications/campaigns/${id}/preview`),
  publishCampaign: (id) => apiClient.post(`/admin/notifications/campaigns/${id}/publish`),
  pauseCampaign: (id) => apiClient.post(`/admin/notifications/campaigns/${id}/pause`),
  cancelCampaign: (id) => apiClient.post(`/admin/notifications/campaigns/${id}/cancel`),
};

export const adminCouponApi = {
  list: (params) => apiClient.get('/admin/coupons', { params }),
  create: (body) => apiClient.post('/admin/coupons', body),
  update: (id, body) => apiClient.patch(`/admin/coupons/${id}`, body),
  setStatus: (id, isActive) => apiClient.patch(`/admin/coupons/${id}/status`, { isActive }),
  analytics: (id) => apiClient.get(`/admin/coupons/${id}/analytics`),
};

export const adminApi = {
  getDashboardAnalytics: (params) => apiClient.get('/admin/analytics/dashboard', { params }),
  getOverview: () => apiClient.get('/admin/analytics/overview'),
  getSales: (period) => apiClient.get('/admin/analytics/sales', { params: { period } }),
  getOrdersReport: () => apiClient.get('/admin/analytics/orders'),
  getAdminOrders: (params) => apiClient.get('/admin/orders', { params }),
  getAdminOrderById: (id) => apiClient.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, data) => apiClient.patch(`/admin/orders/${id}/status`, data),
  assignRider: (id, data) => apiClient.patch(`/admin/orders/${id}/assign-rider`, data),
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  createStaff: (data) => apiClient.post('/admin/staff', data),
  getRiders: (params) => apiClient.get('/admin/riders', { params }),
  reviewRider: (id, data) => apiClient.patch(`/admin/riders/${id}/approval`, data),
  updateUserRole: (id, role) => apiClient.patch(`/admin/users/${id}/role`, { role }),
  updateUserStatus: (id, isActive) => apiClient.patch(`/admin/users/${id}/status`, { isActive }),
  getAuditLogs: (params) => apiClient.get('/admin/audit-logs', { params }),
  getReturns: (params) => apiClient.get('/admin/returns', { params }),
  reviewReturn: (id, data) => apiClient.patch(`/admin/returns/${id}/review`, data),
  getFinanceReconciliation: () => apiClient.get('/admin/finance/reconciliation'),
  reconcileCOD: (data) => apiClient.post('/admin/finance/reconcile-cod', data),
  getProductAnalytics: (params) => apiClient.get('/admin/analytics/products', { params }),
  getCustomerAnalytics: (params) => apiClient.get('/admin/analytics/customers', { params }),
  getInventoryDemand: (params) => apiClient.get('/admin/analytics/inventory', { params }),
  getDeliveryAnalytics: (params) => apiClient.get('/admin/analytics/deliveries', { params }),
  getCampaignAnalytics: (params) => apiClient.get('/admin/analytics/campaigns', { params }),
  getBusinessInsights: (data) => apiClient.post('/admin/analytics/business-insights', data),
};

export const cartApi = {
  getCart: () => apiClient.get('/cart'),
  addItem: (itemData) => apiClient.post('/cart/items', itemData),
  updateItem: (itemId, quantity) => apiClient.patch(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => apiClient.delete(`/cart/items/${itemId}`),
  clearCart: () => apiClient.delete('/cart'),
  mergeCart: () => apiClient.post('/cart/merge'),
};

export const checkoutApi = {
  validate: (data) => apiClient.post('/checkout/validate', data),
  createOrder: (orderData) => apiClient.post('/checkout/create-order', orderData),
  createPaymentSession: (data) => apiClient.post('/payments/create-session', data),
  getPaymentStatus: (paymentId) => apiClient.get(`/payments/${paymentId}/status`),
};

export const orderApi = {
  checkout: (orderData) => apiClient.post('/orders', orderData),
  getMyOrders: (params) => apiClient.get('/orders', { params }),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  getOrderConfirmation: (id) => apiClient.get(`/orders/${id}/confirmation`),
  cancelOrder: (id, data) => apiClient.post(`/orders/${id}/cancel`, data),
  requestReturn: (id, data) => apiClient.post(`/orders/${id}/return-request`, data),
  trackOrder: (orderNumber, phone) => apiClient.get(`/orders/${orderNumber}/track`, { params: { phone } }),
};

export const wishlistApi = {
  getWishlist: () => apiClient.get('/wishlist'),
  addItem: (productId) => apiClient.post('/wishlist/items', { productId }),
  removeItem: (productId) => apiClient.delete(`/wishlist/items/${productId}`),
};

export const couponApi = {
  // Cart-based preview: the server prices the items itself. `subtotal` form is kept only for legacy callers.
  validate: (code, items) => apiClient.post('/coupons/validate', { code, items }),
  validateCoupon: (code, subtotal) => apiClient.post('/coupons/validate', { code, subtotal }),
  available: () => apiClient.get('/coupons/available'),
};

export const reviewApi = {
  getProductReviews: (productId, params) => apiClient.get(`/reviews/product/${productId}`, { params }),
  createReview: (reviewData) => apiClient.post('/reviews', reviewData),
};

export const mediaApi = {
  listMedia: (params) => apiClient.get('/media', { params }),
  getMediaById: (id) => apiClient.get(`/media/${id}`),
  getReferences: (id) => apiClient.get(`/media/${id}/references`),
  uploadMedia: (formData, onUploadProgress) =>
    apiClient.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  getUploadSignature: (params) => apiClient.post('/media/upload-signature', params),
  confirmDirectUpload: (data) => apiClient.post('/media/confirm-direct-upload', data),
  updateMedia: (id, data) => apiClient.patch(`/media/${id}`, data),
  deleteMedia: (id) => apiClient.delete(`/media/${id}`),
};

export const bannerApi = {
  getPublicBanners: (params) => apiClient.get('/banners', { params }),
  listAllBanners: (params) => apiClient.get('/banners/admin', { params }),
  getBannerById: (id) => apiClient.get(`/banners/${id}`),
  createBanner: (data) => apiClient.post('/banners', data),
  updateBanner: (id, data) => apiClient.patch(`/banners/${id}`, data),
  deleteBanner: (id) => apiClient.delete(`/banners/${id}`),
};

export const campaignApi = {
  getPublicCampaigns: (params) => apiClient.get('/campaigns', { params }),
  getCampaignBySlug: (slug) => apiClient.get(`/campaigns/${slug}`),
  listAllCampaigns: (params) => apiClient.get('/campaigns/admin/all', { params }),
  createCampaign: (data) => apiClient.post('/campaigns', data),
  updateCampaign: (id, data) => apiClient.patch(`/campaigns/${id}`, data),
  deleteCampaign: (id) => apiClient.delete(`/campaigns/${id}`),
};

export const aiApi = {
  chat: (data) => apiClient.post('/ai/chat', data),
  productSearch: (data) => apiClient.post('/ai/product-search', data),
  getRecommendations: (params) => apiClient.post('/ai/recommendations', {}, { params }),
  getOutfitSuggestions: (data) => apiClient.post('/ai/outfit-suggestions', data),
  compareProducts: (data) => apiClient.post('/ai/product-comparison', data),
  getConversations: () => apiClient.get('/ai/conversations'),
  getConversationById: (id) => apiClient.get(`/ai/conversations/${id}`),
  deleteConversation: (id) => apiClient.delete(`/ai/conversations/${id}`),
  trackEvent: (data) => apiClient.post('/ai/track-event', data),
};

export default apiClient;


/* ── Catalogue id resolution ──
 * The storefront can show demo products whose id is not a MongoDB ObjectId (e.g. "prod-001").
 * Before talking to cart / checkout endpoints we map those to the real database id via the slug. */
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const resolvedIds = new Map();

export const resolveProductId = async (item) => {
  const current = item.productId || item.id || item._id;
  if (current && OBJECT_ID_RE.test(String(current))) return String(current);
  if (!item.slug) {
    throw new Error(`"${item.name || 'A product'}" is not available in the store database.`);
  }
  if (resolvedIds.has(item.slug)) return resolvedIds.get(item.slug);
  try {
    const res = await apiClient.get(`/products/${item.slug}`);
    const id = res.data?.data?._id;
    if (!id) throw new Error('missing');
    resolvedIds.set(item.slug, id);
    return id;
  } catch {
    throw new Error(
      `"${item.name || item.slug}" could not be found in the store database. Please restart the server (it adds the products automatically), then refresh this page.`
    );
  }
};

export const resolveCartItems = (items) =>
  Promise.all(items.map(async (i) => ({ ...i, productId: await resolveProductId(i) })));
