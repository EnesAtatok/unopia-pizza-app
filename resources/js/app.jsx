import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { apiService } from './api';
import { useHistoryLayer } from './historyLayer';

// Customer Flow Components
import { OpeningAnimation } from './components/customer/OpeningAnimation';
import { WelcomeScreen } from './components/customer/WelcomeScreen';
import { MenuScreen } from './components/customer/MenuScreen';
import { ProductDetailModal } from './components/customer/ProductDetailModal';
import { CartModal } from './components/customer/CartModal';
import { OrderStatusModal } from './components/customer/OrderStatusModal';
import { WaiterCallModal } from './components/customer/WaiterCallModal';

// Staff Panel Flow Components — ayrı paketlerde: müşteri telefonu panel kodunu indirmez
import { canSeeTab } from './components/panel/tabs';
const named = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const PanelLayout = named(() => import('./components/panel/PanelLayout'), 'PanelLayout');
const TablesScreen = named(() => import('./components/panel/TablesScreen'), 'TablesScreen');
const TableDetailDrawer = named(() => import('./components/panel/TableDetailDrawer'), 'TableDetailDrawer');
const AddProductModal = named(() => import('./components/panel/AddProductModal'), 'AddProductModal');
const KitchenScreen = named(() => import('./components/panel/KitchenScreen'), 'KitchenScreen');
const ReportsScreen = named(() => import('./components/panel/ReportsScreen'), 'ReportsScreen');
const LoginModal = named(() => import('./components/panel/LoginModal'), 'LoginModal');
const QrCodesScreen = named(() => import('./components/panel/QrCodesScreen'), 'QrCodesScreen');
const MenuManagementScreen = named(() => import('./components/panel/MenuManagementScreen'), 'MenuManagementScreen');
const StockScreen = named(() => import('./components/panel/StockScreen'), 'StockScreen');

// Mod adresten belirlenir ve uygulama içinden değiştirilemez:
// panel ile müşteri ekranı arasında geçiş yoktur.
const APP_MODE = /\/(panel|pos|kitchen)/.test(window.location.pathname) ? 'panel' : 'customer';

const MainApp = () => {
    const { isAuthenticated, user } = useAuth();
    const { tableNumber, tableError, setActiveOrder, syncWithMenu } = useCart();
    const mode = APP_MODE;

    // Customer states — açılış animasyonu aynı oturumda yalnızca bir kez oynar
    const [showAnimation, setShowAnimation] = useState(
        () => mode === 'customer' && !sessionStorage.getItem('unopia_seen_animation')
    );
    const [customerView, setCustomerView] = useState('welcome'); // 'welcome', 'menu'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWaiterCallOpen, setIsWaiterCallOpen] = useState(false);
    const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);

    // Telefonun geri tuşu en üstteki katmanı kapatır (uygulamadan çıkmaz)
    const isCustomer = mode === 'customer';
    useHistoryLayer(isCustomer && customerView === 'menu', () => setCustomerView('welcome'));
    useHistoryLayer(isCustomer && !!selectedProduct, () => setSelectedProduct(null));
    useHistoryLayer(isCustomer && isCartOpen, () => setIsCartOpen(false));
    useHistoryLayer(isCustomer && isWaiterCallOpen, () => setIsWaiterCallOpen(false));
    useHistoryLayer(isCustomer && isOrderStatusOpen, () => setIsOrderStatusOpen(false));

    // Panel states
    const [activePanelTab, setActivePanelTab] = useState('tables');
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [addProductTable, setAddProductTable] = useState(null);
    const [panelData, setPanelData] = useState(null);
    const [panelLoading, setPanelLoading] = useState(false);
    const [panelError, setPanelError] = useState(null);

    // Global Menu & Categories Data
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);

    const loadMenu = useCallback(async () => {
        try {
            const [cats, prods] = await Promise.all([apiService.getCategories(), apiService.getProducts()]);
            setCategories(cats || []);
            setProducts(prods || []);
        } catch (err) {
            console.error('Menu data loading failed:', err);
        }
    }, []);

    useEffect(() => {
        loadMenu();
    }, [loadMenu]);

    // Sepetteki fiyatlar menüdeki güncel fiyatlarla eşitlenir
    useEffect(() => {
        syncWithMenu(products);
    }, [products, syncWithMenu]);

    // Panel: masalar ve bekleyenler (10 sn'de bir yenilenir)
    const refreshPanel = useCallback(async () => {
        setPanelLoading(true);
        try {
            setPanelData(await apiService.getPanelTables());
            setPanelError(null);
        } catch (err) {
            if (err.response?.status !== 401) setPanelError('Masalar güncellenemedi. Bağlantıyı kontrol edin.');
        } finally {
            setPanelLoading(false);
        }
    }, []);

    useEffect(() => {
        if (mode !== 'panel' || !isAuthenticated) return;
        refreshPanel();
        const interval = setInterval(refreshPanel, 10000);
        return () => clearInterval(interval);
    }, [mode, isAuthenticated, refreshPanel]);

    // Rol değişince (ör. yönetici çıktı, garson girdi) yetkisiz sekme hiç açılmaz: Masalar gösterilir
    const panelTab = canSeeTab(user?.role, activePanelTab) ? activePanelTab : 'tables';

    // Açık masa çekmecesi her yenilemede güncel veriyi gösterir
    const selectedTable = panelData?.tables?.find((t) => t.id === selectedTableId) || null;

    const handleAnimationComplete = () => {
        sessionStorage.setItem('unopia_seen_animation', 'true');
        setShowAnimation(false);
    };

    const handleOrderSuccess = (order) => {
        setActiveOrder(order);
        setIsCartOpen(false);
        setIsOrderStatusOpen(true);
    };

    // --- CUSTOMER VIEW ---
    if (mode === 'customer') {
        return (
            <div className="customer-grain min-h-screen bg-[#141312] text-[#F3EBDD]">
                {showAnimation && <OpeningAnimation onComplete={handleAnimationComplete} />}

                {customerView === 'welcome' && (
                    <WelcomeScreen
                        tableNumber={tableNumber}
                        tableError={tableError}
                        onOpenMenu={() => setCustomerView('menu')}
                    />
                )}

                {customerView === 'menu' && (
                    <MenuScreen
                        categories={categories}
                        products={products}
                        onSelectProduct={(p) => setSelectedProduct(p)}
                        onOpenCart={() => setIsCartOpen(true)}
                        onOpenWaiterCall={() => setIsWaiterCallOpen(true)}
                        onOpenOrderStatus={() => setIsOrderStatusOpen(true)}
                        onBackToWelcome={() => setCustomerView('welcome')}
                    />
                )}

                {selectedProduct && (
                    <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
                )}

                {isCartOpen && (
                    <CartModal
                        onClose={() => setIsCartOpen(false)}
                        onOrderSuccess={handleOrderSuccess}
                        onMenuChanged={loadMenu}
                    />
                )}

                {isWaiterCallOpen && <WaiterCallModal onClose={() => setIsWaiterCallOpen(false)} />}

                {isOrderStatusOpen && <OrderStatusModal onClose={() => setIsOrderStatusOpen(false)} />}
            </div>
        );
    }

    // --- STAFF PANEL VIEW ---
    return (
        <div className="h-[100dvh] w-screen bg-[#0D0C0B] text-[#F3EBDD]">
            <Suspense fallback={null}>
            {!isAuthenticated && <LoginModal onSuccess={() => refreshPanel()} />}

            {isAuthenticated && (
                <PanelLayout
                    activeTab={panelTab}
                    onChangeTab={setActivePanelTab}
                    pendingCount={(panelData?.pending?.orders?.length || 0) + (panelData?.pending?.calls?.length || 0)}
                >
                    {/* Sekme ekranı yüklenirken yalnızca içerik alanı boş kalır, menü yerinde durur */}
                    <Suspense fallback={<div className="flex-1" />}>
                        {panelTab === 'tables' && (
                            <TablesScreen
                                panelData={panelData}
                                onSelectTable={(tbl) => setSelectedTableId(tbl.id)}
                                onRefresh={refreshPanel}
                                loading={panelLoading}
                                error={panelError}
                            />
                        )}
                        {panelTab === 'menu' && <MenuManagementScreen onMenuChanged={loadMenu} />}
                        {panelTab === 'stock' && <StockScreen />}
                        {panelTab === 'reports' && <ReportsScreen />}
                        {panelTab === 'kitchen' && <KitchenScreen />}
                        {panelTab === 'qr' && <QrCodesScreen />}
                    </Suspense>
                </PanelLayout>
            )}

            {selectedTable && (
                <TableDetailDrawer
                    table={selectedTable}
                    tables={panelData?.tables || []}
                    onClose={() => setSelectedTableId(null)}
                    onRefresh={refreshPanel}
                    onOpenAddProduct={(tbl) => {
                        setSelectedTableId(null);
                        setAddProductTable(tbl);
                    }}
                />
            )}

            {addProductTable && (
                <AddProductModal
                    table={addProductTable}
                    products={products}
                    categories={categories}
                    onClose={() => setAddProductTable(null)}
                    onRefresh={refreshPanel}
                />
            )}
            </Suspense>
        </div>
    );
};

const App = () => (
    <AuthProvider>
        <CartProvider>
            <MainApp />
        </CartProvider>
    </AuthProvider>
);

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<App />);
}
