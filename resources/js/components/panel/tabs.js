import { LayoutGrid, UtensilsCrossed, Package, BarChart3, ChefHat, QrCode } from 'lucide-react';
import { MANAGER_ROLES } from '../../context/AuthContext';

// Brif: solda dar menü — Masalar, Menü, Stok, Raporlar. Mutfak ekranı ve QR kodlar ayrı grupta.
// roles: sekmeyi görebilecek roller (boş = herkes). Yönetici tüm ekranları, garson masalar,
// mutfak ekranı ve QR kodları görür. phoneLabel: telefondaki dar alt çubuk için kısa ad.
export const MAIN_TABS = [
    { id: 'tables', label: 'Masalar', icon: LayoutGrid },
    { id: 'menu', label: 'Menü', icon: UtensilsCrossed, roles: MANAGER_ROLES },
    { id: 'stock', label: 'Stok', icon: Package, roles: MANAGER_ROLES },
    { id: 'reports', label: 'Raporlar', icon: BarChart3, roles: MANAGER_ROLES },
];
export const EXTRA_TABS = [
    { id: 'kitchen', label: 'Mutfak ekranı', phoneLabel: 'Mutfak', icon: ChefHat },
    { id: 'qr', label: 'QR kodlar', phoneLabel: 'QR', icon: QrCode },
];

export const ROLE_LABELS = { patron: 'Yönetici', mudur: 'Yönetici', garson: 'Garson', mutfak: 'Mutfak' };

export const visibleFor = (role) => (tab) => !tab.roles || tab.roles.includes(role);

/** Bu rol bu sekmeyi açabilir mi? (yetkisiz sekmede kalınmasın diye uygulama da kullanır) */
export const canSeeTab = (role, tabId) => [...MAIN_TABS, ...EXTRA_TABS].some((t) => t.id === tabId && visibleFor(role)(t));
