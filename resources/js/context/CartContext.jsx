import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../api';
import { priceForSize } from '../productImage';

const CartContext = createContext();

/** Bir sepet satırında en fazla adet (sunucu sınırıyla aynı) */
export const MAX_LINE_QTY = 50;

// Sepet, doldurulduğu masanın QR token'ı ile saklanır: başka masanın QR'ı okutulunca eski sepet taşınmaz
const readCart = (tableToken) => {
    try {
        const saved = JSON.parse(localStorage.getItem('unopia_cart'));
        if (!saved || !Array.isArray(saved.items)) return [];
        return saved.token === tableToken ? saved.items : [];
    } catch {
        return [];
    }
};

export const CartProvider = ({ children }) => {
    // Her masanın QR kodu /masa/{token} linkini açar. Token backend'de doğrulanıp masa adına çevrilir;
    // sipariş ve garson çağrısı bu token ile gönderilir. Varsayılan sahte bir masa atanmaz.
    // Masa yalnızca QR koddan belirlenir; müşteri masa seçemez/değiştiremez.
    const [tableToken] = useState(() => {
        localStorage.removeItem('unopia_table'); // eski sürümden kalan kalıcı "Masa 4" kaydını temizle
        const fromPath = window.location.pathname.match(/^\/masa\/([A-Za-z0-9]+)\/?$/)?.[1];
        if (fromPath) {
            sessionStorage.setItem('unopia_table_token', fromPath);
            return fromPath;
        }
        return sessionStorage.getItem('unopia_table_token');
    });

    const [cart, setCart] = useState(() => readCart(tableToken));
    // Sepetteki bir ürünün fiyatı menüde değiştiyse müşteriye bir kez bildirilir
    const [pricesUpdated, setPricesUpdated] = useState(false);
    const [tableNumber, setTableNumber] = useState(() => sessionStorage.getItem('unopia_table'));
    const [tableError, setTableError] = useState(null);

    useEffect(() => {
        if (!tableToken) return;
        apiService.resolveTable(tableToken)
            .then((table) => {
                setTableNumber(table.name);
                setTableError(null);
            })
            .catch((err) => {
                setTableNumber(null);
                sessionStorage.removeItem('unopia_table');
                sessionStorage.removeItem('unopia_table_token');
                setTableError(
                    err.response?.status === 404
                        ? err.response.data?.message
                        : 'Masa bilgisi alınamadı. Lütfen bağlantınızı kontrol edip sayfayı yenileyin.'
                );
            });
    }, [tableToken]);

    const [activeOrder, setActiveOrder] = useState(() => {
        try {
            const saved = localStorage.getItem('unopia_active_order');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [waiterCallTime, setWaiterCallTime] = useState(() => {
        try {
            const saved = localStorage.getItem('unopia_waiter_call');
            return saved ? parseInt(saved, 10) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        localStorage.setItem('unopia_cart', JSON.stringify({ token: tableToken, items: cart }));
    }, [cart, tableToken]);

    useEffect(() => {
        if (tableNumber) {
            sessionStorage.setItem('unopia_table', tableNumber);
        }
    }, [tableNumber]);

    useEffect(() => {
        if (activeOrder) {
            localStorage.setItem('unopia_active_order', JSON.stringify(activeOrder));
        } else {
            localStorage.removeItem('unopia_active_order');
        }
    }, [activeOrder]);

    // Sipariş durumu canlı takip: Gönderildi → Onaylandı → Hazırlanıyor → Hazır → Servis edildi.
    // Siparişin verildiği masanın token'ı siparişle birlikte saklanır (track_token): sayfa yeni sekmede
    // açılsa da takip sürer. Hesap kapanınca takip biter; başka masanın siparişi bu token ile görülemez.
    const activeOrderId = activeOrder?.id;
    const activeOrderStatus = activeOrder?.status;
    const trackToken = activeOrder?.track_token || tableToken;

    const refreshActiveOrder = useCallback(async () => {
        if (!activeOrderId || !trackToken) return;
        try {
            const fresh = await apiService.trackOrder(activeOrderId, trackToken);
            setActiveOrder((prev) =>
                fresh.status === 'completed' || !prev ? null : { ...fresh, track_token: prev.track_token || trackToken }
            );
        } catch (err) {
            if (err.response?.status === 404) setActiveOrder(null); // başka masaya ait / silinmiş
        }
    }, [activeOrderId, trackToken]);

    useEffect(() => {
        if (!activeOrderId || !trackToken) return;
        if (['completed', 'rejected'].includes(activeOrderStatus)) return;

        refreshActiveOrder();
        const timer = setInterval(refreshActiveOrder, 4000);
        // Telefon kilidi açılınca / sekmeye dönülünce beklemeden güncelle
        const onVisible = () => document.visibilityState === 'visible' && refreshActiveOrder();
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [activeOrderId, activeOrderStatus, trackToken, refreshActiveOrder]);

    // Yeni sipariş: verildiği masanın token'ı ile birlikte saklanır
    const startTracking = (order) => setActiveOrder(order ? { ...order, track_token: order.track_token || tableToken } : null);

    const addToCart = (product, size = 'Orta', quantity = 1, notes = '') => {
        const price = priceForSize(product, size);

        setCart((prev) => {
            const existingIndex = prev.findIndex(
                (item) => item.product.id === product.id && item.size === size && item.notes === notes
            );

            if (existingIndex > -1) {
                return prev.map((item, i) =>
                    i === existingIndex ? { ...item, quantity: Math.min(MAX_LINE_QTY, item.quantity + quantity) } : item
                );
            }

            return [...prev, { product, size, quantity: Math.min(MAX_LINE_QTY, quantity), notes, price }];
        });
    };

    const updateQuantity = (index, delta) => {
        setCart((prev) =>
            prev
                .map((item, i) => (i === index ? { ...item, quantity: Math.min(MAX_LINE_QTY, item.quantity + delta) } : item))
                .filter((item) => item.quantity > 0)
        );
    };

    // Menü her yüklendiğinde sepetteki fiyat ve satış durumu güncel ürün verisiyle eşitlenir:
    // müşteri ekranda gördüğü tutarla sipariş verir
    const syncWithMenu = useCallback((products) => {
        if (!products?.length) return;
        const byId = new Map(products.map((p) => [p.id, p]));
        setCart((prev) => {
            let changedPrice = false;
            const next = prev.map((item) => {
                const fresh = byId.get(item.product.id);
                if (!fresh) return item;
                const price = priceForSize(fresh, item.size);
                if (price !== item.price) changedPrice = true;
                return price !== item.price || fresh.is_active !== item.product.is_active ? { ...item, product: fresh, price } : item;
            });
            if (changedPrice) setPricesUpdated(true);
            return next.some((item, i) => item !== prev[i]) ? next : prev;
        });
    }, []);

    const removeFromCart = (index) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const triggerWaiterCall = () => {
        const now = Date.now();
        setWaiterCallTime(now);
        localStorage.setItem('unopia_waiter_call', now.toString());
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                tableNumber,
                tableToken: tableNumber ? tableToken : null, // yalnızca doğrulanmış token kullanılır
                tableError,
                addToCart,
                updateQuantity,
                syncWithMenu,
                pricesUpdated,
                dismissPricesUpdated: () => setPricesUpdated(false),
                removeFromCart,
                clearCart,
                cartTotal,
                cartCount,
                activeOrder,
                setActiveOrder: startTracking,
                refreshActiveOrder,
                waiterCallTime,
                triggerWaiterCall,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
