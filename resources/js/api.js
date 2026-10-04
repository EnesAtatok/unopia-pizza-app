import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Panel oturumu yalnızca bellekte tutulur: panel her açıldığında / yenilendiğinde şifre sorulur,
// girilen şifreye göre yönetici ya da garson ekranları açılır. Tarayıcıda kalıcı oturum kalmaz.
let authToken = null;

// Eski sürüm oturumu tarayıcıda kalıcı saklıyordu: varsa sil ve sunucuda iptal et
const legacyToken = localStorage.getItem('unopia_token');
localStorage.removeItem('unopia_token');
localStorage.removeItem('unopia_user');
if (legacyToken) {
    api.post('/logout', null, { headers: { Authorization: `Bearer ${legacyToken}` } }).catch(() => {});
}

api.interceptors.request.use((config) => {
    if (authToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});

// Oturum süresi dolmuş / geçersiz token: oturumu kapat, panel giriş ekranını göstersin
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Yalnızca isteği atan oturum hâlâ geçerli oturumsa: çıkıştan sonra dönen eski bir istek
        // (yönetici çıktı, garson girdi) yeni oturumu kapatmasın
        const sentWith = error.config?.headers?.Authorization;
        if (error.response?.status === 401 && authToken && sentWith === `Bearer ${authToken}`) {
            authToken = null;
            window.dispatchEvent(new Event('unopia:unauthorized'));
        }
        return Promise.reject(error);
    }
);

// Sunucu hatasında (5xx) ham sunucu mesajı yerine ekranın kendi Türkçe mesajı gösterilir
export const errorMessage = (error, fallback) =>
    (error.response && error.response.status < 500 && error.response.data?.message) || fallback;

export const apiService = {
    // Auth: panel girişi 4 haneli şifre (PIN) ile
    login: async (pin) => {
        const response = await api.post('/login', { pin });
        if (response.data.token) {
            authToken = response.data.token;
        }
        return response.data;
    },
    // Oturum hemen silinir; sunucudaki token iptali eski token ile ayrıca yapılır
    // (iptal sürerken yeni giriş yapılırsa yeni oturuma dokunulmaz)
    logout: async () => {
        const token = authToken;
        authToken = null;
        if (!token) return;
        try {
            await api.post('/logout', null, { headers: { Authorization: `Bearer ${token}` } });
        } catch {
            // ignore
        }
    },
    // Yönetici: yönetici / garson şifrelerini değiştirir (boş = değişmez)
    updatePins: async ({ managerPin, waiterPin }) =>
        (await api.put('/panel/pins', { manager_pin: managerPin || null, waiter_pin: waiterPin || null })).data,

    // Menu & Products (müşteri)
    getCategories: async () => (await api.get('/categories')).data.data,
    getProducts: async () => (await api.get('/products')).data.data,

    // Masa & QR (müşteri: token -> masa)
    resolveTable: async (token) => (await api.get(`/tables/resolve/${encodeURIComponent(token)}`)).data.data,

    // Müşteri siparişi
    createOrder: async (orderData) => (await api.post('/orders', orderData)).data,
    trackOrder: async (orderId, tableToken) =>
        (await api.get(`/orders/${orderId}/track`, { params: { table_token: tableToken } })).data.data,
    callWaiter: async (callData) => (await api.post('/waiter-calls', callData)).data,

    // Panel: Masalar & Bekleyenler
    getPanelTables: async () => (await api.get('/panel/tables')).data.data,
    approveOrder: async (orderId) => (await api.post(`/panel/orders/${orderId}/approve`)).data,
    rejectOrder: async (orderId) => (await api.post(`/panel/orders/${orderId}/reject`)).data,
    addItemToTable: async (itemData) => (await api.post('/panel/tables/items', itemData)).data,
    // paymentMethod: cash | credit_card | mixed (hesap bölme: cashAmount nakit, kalanı kart)
    checkoutTable: async (table, paymentMethod, cashAmount = null) =>
        (await api.post('/panel/tables/checkout', { table, payment_method: paymentMethod, cash_amount: cashAmount })).data,
    moveTable: async (from, to) => (await api.post('/panel/tables/move', { from, to })).data,
    resolveWaiterCall: async (callId) => (await api.patch(`/panel/waiter-calls/${callId}/resolve`)).data,

    // Panel: Mutfak
    getActiveKitchenOrders: async () => (await api.get('/kitchen/orders')).data.data,
    updateOrderStatus: async (orderId, status) => (await api.patch(`/orders/${orderId}/status`, { status })).data,

    // Panel: Menü yönetimi
    getPanelProducts: async () => (await api.get('/panel/products')).data.data,
    saveProduct: async (productId, formData) => {
        const url = productId ? `/panel/products/${productId}` : '/panel/products';
        return (await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
    },
    setProductAvailability: async (productId, isActive) =>
        (await api.patch(`/panel/products/${productId}/availability`, { is_active: isActive })).data.data,
    setProductVisibility: async (productId, isVisible) =>
        (await api.patch(`/panel/products/${productId}/visibility`, { is_visible: isVisible })).data.data,
    createCategory: async (name) => (await api.post('/panel/categories', { name })).data.data,

    // Panel: Stok ve reçete
    getStock: async () => (await api.get('/panel/stock')).data.data,
    createRawMaterial: async (data) => (await api.post('/panel/stock', data)).data.data,
    purchaseStock: async (id, data) => (await api.post(`/panel/stock/${id}/purchase`, data)).data.data,
    countStock: async (id, actual) => (await api.post(`/panel/stock/${id}/count`, { actual })).data.data,
    wasteStock: async (id, data) => (await api.post(`/panel/stock/${id}/waste`, data)).data.data,
    getStockMovements: async (id) => (await api.get(`/panel/stock/${id}/movements`)).data.data,
    getRecipe: async (productId) => (await api.get(`/panel/recipes/${productId}`)).data.data,
    saveRecipe: async (productId, items) => (await api.put(`/panel/recipes/${productId}`, { items })).data.data,

    // Panel: Raporlar
    // period: day | week | month
    getDailyReport: async (date, period = 'day') => (await api.get('/reports/daily', { params: { date, period } })).data.data,

    // Panel: Masa & QR kod yönetimi
    getQrTables: async () => (await api.get('/panel/qr-tables')).data.data,
    createQrTable: async (tableData) => (await api.post('/panel/qr-tables', tableData)).data.data,
    setQrTableActive: async (tableId, isActive) =>
        (await api.patch(`/panel/qr-tables/${tableId}`, { is_active: isActive })).data.data,
    regenerateQrTable: async (tableId) => (await api.post(`/panel/qr-tables/${tableId}/regenerate`)).data.data,
};

export default api;
