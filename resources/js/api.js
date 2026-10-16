import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Eski sürümlerden tarayıcıda kalan oturum ve sepet kayıtlarını temizle
['unopia_token', 'unopia_user', 'unopia_cart', 'unopia_active_order', 'unopia_waiter_call'].forEach((key) =>
    localStorage.removeItem(key)
);

// QR menüde seçilen dil: müşteriye giden sunucu mesajları bu dilde döner (panel ayarlamaz → Türkçe)
let customerLocale = null;
export const setApiLocale = (locale) => {
    customerLocale = locale;
};

api.interceptors.request.use((config) => {
    if (customerLocale) config.headers['X-Locale'] = customerLocale;
    return config;
});

// Sunucu hatasında (5xx) ham sunucu mesajı yerine ekranın kendi Türkçe mesajı gösterilir
export const errorMessage = (error, fallback) =>
    (error.response && error.response.status < 500 && error.response.data?.message) || fallback;

export const apiService = {
    // Menu & Products (müşteri)
    getCategories: async () => (await api.get('/categories')).data.data,
    getProducts: async () => (await api.get('/products')).data.data,
    getExtras: async () => (await api.get('/extras')).data.data,


    // Panel: Menü yönetimi
    getPanelProducts: async () => (await api.get('/panel/products')).data.data,
    saveProduct: async (productId, formData) => {
        const url = productId ? `/panel/products/${productId}` : '/panel/products';
        return (await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
    },
    // Toplu fiyat: { ids, mode: 'percent' | 'amount', direction: 'increase' | 'decrease', value }
    bulkUpdatePrices: async (data) => (await api.post('/panel/products/bulk-price', data)).data.data,
    deleteProduct: async (productId) => (await api.delete(`/panel/products/${productId}`)).data,
    setProductAvailability: async (productId, isActive) =>
        (await api.patch(`/panel/products/${productId}/availability`, { is_active: isActive })).data.data,
    setProductVisibility: async (productId, isVisible) =>
        (await api.patch(`/panel/products/${productId}/visibility`, { is_visible: isVisible })).data.data,
    createCategory: async (name) => (await api.post('/panel/categories', { name })).data.data,
    // data: { name?, translations? } — translations: { en: { name }, bg: {...}, el: {...} }
    updateCategory: async (id, data) => (await api.patch(`/panel/categories/${id}`, data)).data.data,
    // İçinde ürün olan kategori silinmez (409, açıklamalı mesaj)
    deleteCategory: async (id) => (await api.delete(`/panel/categories/${id}`)).data,

    // Panel: İlaveler — data: { name?, price?, is_active?, translations? }
    getPanelExtras: async () => (await api.get('/panel/extras')).data.data,
    createExtra: async (data) => (await api.post('/panel/extras', data)).data.data,
    updateExtra: async (id, data) => (await api.patch(`/panel/extras/${id}`, data)).data.data,
    deleteExtra: async (id) => (await api.delete(`/panel/extras/${id}`)).data,
};

export default api;
