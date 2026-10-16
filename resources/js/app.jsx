import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { apiService } from './api';
import { useHistoryLayer } from './historyLayer';
import { LangProvider, useLang } from './i18n/LangContext';
import { localizeProduct, localizeCategory, localizeExtra } from './i18n/localize';

// QR menü (müşteri ekranı) bileşenleri
import { OpeningAnimation } from './components/customer/OpeningAnimation';
import { WelcomeScreen } from './components/customer/WelcomeScreen';
import { MenuScreen } from './components/customer/MenuScreen';
import { ProductDetailModal } from './components/customer/ProductDetailModal';

// Yönetim paneli (menü yönetimi + QR kodlar) — ayrı paketlerde: müşteri telefonu panel kodunu indirmez
const named = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const PanelLayout = named(() => import('./components/panel/PanelLayout'), 'PanelLayout');
const MenuManagementScreen = named(() => import('./components/panel/MenuManagementScreen'), 'MenuManagementScreen');
const QrCodesScreen = named(() => import('./components/panel/QrCodesScreen'), 'QrCodesScreen');

// Mod adresten belirlenir ve uygulama içinden değiştirilemez:
// panel ile müşteri ekranı arasında geçiş yoktur.
const APP_MODE = /\/panel/.test(window.location.pathname) ? 'panel' : 'customer';

const MainApp = () => {
    const mode = APP_MODE;

    // Customer states — açılış animasyonu aynı oturumda yalnızca bir kez oynar
    const [showAnimation, setShowAnimation] = useState(
        () => mode === 'customer' && !sessionStorage.getItem('unopia_seen_animation')
    );
    const [customerView, setCustomerView] = useState('welcome'); // 'welcome', 'menu'
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Panel sekmesi: 'menu' | 'qr'
    const [panelTab, setPanelTab] = useState('menu');

    // Telefonun geri tuşu en üstteki katmanı kapatır (uygulamadan çıkmaz)
    const isCustomer = mode === 'customer';
    useHistoryLayer(isCustomer && customerView === 'menu', () => setCustomerView('welcome'));
    useHistoryLayer(isCustomer && !!selectedProduct, () => setSelectedProduct(null));

    // Global Menu & Categories Data
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [extras, setExtras] = useState([]);

    const loadMenu = useCallback(async () => {
        try {
            const [cats, prods, exts] = await Promise.all([
                apiService.getCategories(),
                apiService.getProducts(),
                apiService.getExtras().catch(() => []), // ilaveler yüklenemezse menü yine açılır
            ]);
            setCategories(cats || []);
            setProducts(prods || []);
            setExtras(exts || []);
        } catch (err) {
            console.error('Menu data loading failed:', err);
        }
    }, []);

    useEffect(() => {
        loadMenu();
    }, [loadMenu]);

    // Müşteri menüsü seçilen dilde (çevirisi olmayan alan Türkçe); panel ham veriyi kullanır
    const { lang } = useLang();
    const menuProducts = useMemo(() => products.map((p) => localizeProduct(p, lang)), [products, lang]);
    const menuCategories = useMemo(() => categories.map((c) => localizeCategory(c, lang)), [categories, lang]);
    const menuExtras = useMemo(() => extras.map((e) => localizeExtra(e, lang)), [extras, lang]);

    const handleAnimationComplete = () => {
        sessionStorage.setItem('unopia_seen_animation', 'true');
        setShowAnimation(false);
    };

    // --- CUSTOMER VIEW ---
    if (mode === 'customer') {
        return (
            <div className="customer-grain min-h-screen bg-[#141312] text-[#F3EBDD]">
                {showAnimation && <OpeningAnimation onComplete={handleAnimationComplete} />}

                {customerView === 'welcome' && (
                    <WelcomeScreen
                        onOpenMenu={() => setCustomerView('menu')}
                    />
                )}

                {customerView === 'menu' && (
                    <MenuScreen
                        categories={menuCategories}
                        products={menuProducts}
                        onSelectProduct={(p) => setSelectedProduct(p)}
                        onBackToWelcome={() => setCustomerView('welcome')}
                    />
                )}

                {selectedProduct && (
                    <ProductDetailModal
                        product={localizeProduct(selectedProduct, lang)}
                        extras={selectedProduct.has_extras ? menuExtras : []}
                        onClose={() => setSelectedProduct(null)}
                    />
                )}
            </div>
        );
    }

    // --- YÖNETİM PANELİ: tek rol, giriş yok ---
    return (
        <div className="h-[100dvh] w-screen bg-[#0D0C0B] text-[#F3EBDD]">
            <Suspense fallback={null}>
                <PanelLayout activeTab={panelTab} onTabChange={setPanelTab}>
                    {panelTab === 'menu' && <MenuManagementScreen onMenuChanged={loadMenu} />}
                    {panelTab === 'qr' && <QrCodesScreen />}
                </PanelLayout>
            </Suspense>
        </div>
    );
};

// Dil yalnızca müşteri ekranında (QR menü) seçilebilir; panel Türkçe kalır
const App = () => (
    <LangProvider enabled={APP_MODE === 'customer'}>
        <MainApp />
    </LangProvider>
);

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<App />);
}
