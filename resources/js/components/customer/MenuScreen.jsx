import React, { useState, useMemo } from 'react';
import { Search, Bell, ShoppingBag, ArrowLeft, Receipt } from 'lucide-react';
import { AllergenIcon, VegetarianLeafIcon, SauceDrips } from '../common/Icons';
import { useCart } from '../../context/CartContext';
import { getDefaultSize, priceForSize, formatPrice, productDisplayName, matchesSearch } from '../../productImage';
import { ProductPhoto } from './ProductPhoto';
import { useLang } from '../../i18n/LangContext';
import { tableLabel } from '../../i18n/localize';

const WAITER_LOCK_MS = 180000;

const AllergenBadges = ({ product }) => {
    const { t } = useLang();
    const allergens = Array.isArray(product.allergens) ? product.allergens : [];
    const withIcon = allergens.filter((a) => AllergenIcon({ name: a }));
    if (withIcon.length === 0 && !product.is_vegetarian) return null;

    return (
        <div className="flex items-center gap-1.5">
            {withIcon.map((a) => (
                <span key={a} title={t(`allergen.${a}`, null, a)} aria-label={t(`allergen.${a}`, null, a)} className="w-6 h-6 rounded-full border border-[#6E6B45]/70 flex items-center justify-center text-[#A6A277]">
                    <AllergenIcon name={a} className="w-3.5 h-3.5" />
                </span>
            ))}
            {/* Vejetaryen etiketi alerjenlerden ayrı: farklı (dolgulu) görünüm */}
            {product.is_vegetarian && (
                <span title={t('product.vegetarian')} aria-label={t('product.vegetarian')} className="w-6 h-6 rounded-full bg-[#6E6B45]/30 flex items-center justify-center text-[#A6A277]">
                    <VegetarianLeafIcon className="w-3.5 h-3.5" />
                </span>
            )}
        </div>
    );
};

const ProductCard = ({ product, onSelect }) => {
    const { t } = useLang();
    const isSoldOut = !product.is_active;

    return (
        <div
            onClick={() => !isSoldOut && onSelect(product)}
            className={`bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] rounded-[16px] p-3 flex gap-3.5 relative transition-colors ${
                isSoldOut ? 'opacity-50' : 'cursor-pointer hover:border-[rgba(243,235,221,0.16)]'
            }`}
        >
            {/* Fotoğraf yoksa kutu çizilmez; kart yalnızca metinle düzgün görünür */}
            <ProductPhoto
                product={product}
                variant="thumb"
                wrapperClassName="w-[118px] self-center aspect-[1024/849] rounded-[12px] overflow-hidden bg-[#141312] shrink-0"
                className="w-full h-full object-cover"
            />

            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 [overflow-wrap:anywhere] font-heading text-[15px] leading-tight tracking-wide text-[#F3EBDD]">
                            {productDisplayName(product.name)}
                        </h3>
                        <span className="font-heading text-[15px] text-[#F3EBDD] tabular-nums shrink-0">
                            {formatPrice(priceForSize(product, getDefaultSize(product)))}
                        </span>
                    </div>
                    {product.description && (
                        <p className="text-xs text-[#B5AEA3] mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
                    )}
                </div>

                <div className="flex items-end justify-between mt-2.5 gap-2">
                    <AllergenBadges product={product} />
                    {/* Hızlı ekleme yok: ürün yalnızca detay ekranında içeriği görülüp boyu seçilerek sepete eklenir */}
                    {isSoldOut && (
                        <span className="ml-auto text-[11px] font-semibold px-3 py-1.5 rounded-full bg-[#141312] border border-[#F3EBDD]/15 text-[#B5AEA3]">
                            {t('product.soldOut')}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export const MenuScreen = ({
    categories = [],
    products = [],
    onSelectProduct,
    onOpenCart,
    onOpenWaiterCall,
    onOpenOrderStatus,
    onBackToWelcome,
}) => {
    const { cartCount, cartTotal, tableNumber, activeOrder, waiterCallTime } = useCart();
    const { t } = useLang();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const activeCatId = selectedCategory || (categories.length > 0 ? categories[0].id : null);

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            // Arama yapılırken tüm kategorilerde aranır
            // Seçilen dilde ve Türkçe adla arama
            if (searchQuery.trim()) return matchesSearch(p, searchQuery) || (p._tr && matchesSearch(p._tr, searchQuery));
            return activeCatId ? p.category_id === activeCatId : true;
        });
    }, [products, activeCatId, searchQuery]);

    const isWaiterComing = waiterCallTime && Date.now() - waiterCallTime < WAITER_LOCK_MS;
    const showOrderButton = activeOrder && activeOrder.status !== 'rejected';

    return (
        <div className="min-h-[100dvh] bg-[#141312] text-[#F3EBDD] pb-28 max-w-[430px] mx-auto relative">
            {/* Header: logo ve masa numarası */}
            <header className="sticky top-0 z-30 bg-[#141312]/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-[#F3EBDD]/5 overflow-hidden">
                {/* Sağ üst köşeden akan sos damlaları (mockup'taki gibi; saf SVG) */}
                <div className="absolute top-0 right-0 w-[130px] h-[120px] pointer-events-none overflow-hidden opacity-90" aria-hidden="true">
                    <SauceDrips className="absolute top-0 right-0 w-[301px] h-[119px]" />
                </div>
                <div className="flex items-center justify-between gap-3 relative z-20">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            onClick={onBackToWelcome}
                            className="w-11 h-11 rounded-full bg-[#1E1C1A] border border-[#F3EBDD]/10 flex items-center justify-center hover:bg-[#252320] transition-colors cursor-pointer shrink-0"
                            aria-label={t('menu.back')}
                        >
                            <ArrowLeft className="w-5 h-5 text-[#F3EBDD]" />
                        </button>
                        <img src="/images/unopia-logo-round.png" alt="UNOPIA" className="w-11 h-11 rounded-full shrink-0" />
                        <div className="min-w-0">
                            <div className="font-heading text-base tracking-wider text-[#F3EBDD] leading-none">UNOPIA</div>
                            {tableNumber && <div className="text-xs text-[#A6A277] mt-1 truncate">{tableLabel(tableNumber, t)}</div>}
                        </div>
                    </div>

                    {/* Siparişim: sipariş durumu kapatılınca buradan tekrar açılır */}
                    {showOrderButton && (
                        <button
                            onClick={onOpenOrderStatus}
                            className="h-11 px-4 rounded-full bg-[#1E1C1A] border border-[#6E6B45]/70 text-[#F3EBDD] text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0"
                        >
                            <Receipt className="w-4 h-4 text-[#A6A277]" />
                            {t('menu.myOrder')}
                        </button>
                    )}
                </div>

                {/* Arama */}
                <div className="mt-3 relative">
                    <Search className="w-4 h-4 text-[#B5AEA3] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="search"
                        placeholder={t('menu.search')}
                        value={searchQuery}
                        maxLength={60}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] rounded-full text-sm text-[#F3EBDD] placeholder-[#B5AEA3]/80 focus:outline-none focus:border-[#6E6B45] transition-colors"
                    />
                </div>

                {/* Kategori çipleri (aktif: haki) */}
                {!searchQuery && (
                    <div className="mt-3 -mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                        {categories.map((cat) => {
                            const isActive = cat.id === activeCatId;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`h-11 px-4 rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer ${
                                        isActive
                                            ? 'bg-[#6E6B45] text-[#F3EBDD] font-semibold'
                                            : 'bg-[#1E1C1A] text-[#B5AEA3] hover:text-[#F3EBDD] border border-[rgba(243,235,221,0.08)]'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </header>

            {/* Ürünler */}
            <main className="px-4 pt-3 space-y-3">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-16 text-[#B5AEA3] text-sm [overflow-wrap:anywhere]">
                        {searchQuery ? t('menu.noResults', { q: searchQuery }) : t('menu.emptyCategory')}
                    </div>
                ) : (
                    filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onSelect={onSelectProduct}
                        />
                    ))
                )}
            </main>

            {/* Alt çubuk: Garson çağır her zaman altta. Sepette ürün varsa: solda kısa "Garson", sağda "Sepet · adet · tutar" */}
            <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#141312] via-[#141312]/95 to-transparent pointer-events-none">
                <div className="max-w-[430px] mx-auto pointer-events-auto flex items-center gap-3">
                    <button
                        onClick={onOpenWaiterCall}
                        className={`h-12 rounded-full border text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                            cartCount > 0 ? 'px-4' : 'flex-1'
                        } ${
                            isWaiterComing
                                ? 'bg-[#1E1C1A] text-[#A6A277] border-[#6E6B45]'
                                : 'bg-[#1E1C1A] hover:bg-[#252320] text-[#F3EBDD] border-[#F3EBDD]/15'
                        }`}
                    >
                        <Bell className="w-4 h-4 text-[#A6A277]" />
                        <span>{isWaiterComing ? t('waiter.coming') : cartCount > 0 ? t('waiter.short') : t('waiter.call')}</span>
                    </button>

                    {cartCount > 0 && (
                        <button
                            onClick={onOpenCart}
                            className="flex-1 h-12 px-5 rounded-full bg-[#7B1E2B] hover:bg-[#9A2A38] active:bg-[#9A2A38] text-[#F3EBDD] text-sm font-semibold flex items-center justify-center gap-2 shadow-xl shadow-[#7B1E2B]/40 transition-colors cursor-pointer"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            <span className="tabular-nums">
                                {t('menu.cartBar', { n: cartCount, total: formatPrice(cartTotal) })}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
