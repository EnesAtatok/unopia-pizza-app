import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus, Flame } from 'lucide-react';
import { AllergenIcon, VegetarianLeafIcon, HeroDrips } from '../common/Icons';
import { useCart } from '../../context/CartContext';
import { getSizeOptions, getDefaultSize, priceForSize, formatPrice, productDisplayName } from '../../productImage';
import { ProductPhoto } from './ProductPhoto';
import { useLang } from '../../i18n/LangContext';

export const ProductDetailModal = ({ product, onClose }) => {
    const { addToCart } = useCart();
    const { t } = useLang();

    const [selectedSize, setSelectedSize] = useState(() => getDefaultSize(product));
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [addedSuccess, setAddedSuccess] = useState(false);

    // Yalnızca ürün için tanımlı boylar gösterilir (tek boylu üründe seçici gizlenir).
    const sizeOptions = getSizeOptions(product);
    const currentPrice = priceForSize(product, selectedSize);
    const allergens = Array.isArray(product.allergens) ? product.allergens : [];

    const handleAddToCart = () => {
        addToCart(product, selectedSize, quantity, notes.trim());
        setAddedSuccess(true);
        setTimeout(onClose, 350);
    };

    const backButton = (
        <button
            onClick={onClose}
            className="absolute top-4 left-4 w-11 h-11 rounded-full bg-[#141312]/75 backdrop-blur-md border border-[#F3EBDD]/10 flex items-center justify-center text-[#F3EBDD] hover:bg-[#141312] transition-colors cursor-pointer z-10"
            aria-label={t('detail.back')}
        >
            <ArrowLeft className="w-5 h-5" />
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 bg-[#141312] max-w-[430px] mx-auto">
            <div className="h-full overflow-y-auto no-scrollbar relative flex flex-col">
                {/* Büyük fotoğraf: kenardan kenara, alt kenarından damlalar sarkar.
                    Fotoğrafsız üründe yalnızca üst boşluk ve damla motifi kalır. */}
                <ProductPhoto
                    product={product}
                    wrapperClassName="relative w-full aspect-[1024/849] shrink-0 bg-[#1E1C1A]"
                    className="w-full h-full object-cover"
                    fallback={
                        <div className="relative w-full h-20 shrink-0 bg-[#1E1C1A]">
                            {backButton}
                            <div className="absolute top-full left-0 right-0 -translate-y-[6px] h-12 z-10 pointer-events-none">
                                <HeroDrips className="h-full" />
                            </div>
                        </div>
                    }
                >
                    {backButton}
                    <div className="absolute top-full left-0 right-0 -translate-y-[6px] h-12 z-10 pointer-events-none">
                        <HeroDrips className="h-full" />
                    </div>
                </ProductPhoto>

                <div className="p-6 pt-9 space-y-6">
                    {/* Ad, fiyat, açıklama, vejetaryen etiketi */}
                    <div>
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="min-w-0 [overflow-wrap:anywhere] font-heading text-[26px] min-[360px]:text-[32px] leading-[1.05] tracking-wide text-[#F3EBDD]">
                                {productDisplayName(product.name)}
                            </h2>
                            <span className="font-heading text-2xl text-[#F3EBDD] tabular-nums shrink-0 pt-1">
                                {formatPrice(currentPrice)}
                            </span>
                        </div>

                        {product.description && (
                            <p className="text-[15px] text-[#B5AEA3] leading-relaxed mt-2">{product.description}</p>
                        )}

                        {product.is_vegetarian && (
                            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6E6B45]/25 border border-[#6E6B45]/60 text-[#A6A277] text-xs font-semibold">
                                <VegetarianLeafIcon className="w-3.5 h-3.5" />
                                {t('product.vegetarian')}
                            </span>
                        )}
                    </div>

                    {/* Boy seçimi (Küçük / Orta / Büyük, fiyatlarıyla) — seçili boy bordo */}
                    {sizeOptions.length > 1 && (
                        <div className="grid grid-cols-3 gap-0 p-1 rounded-[16px] bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)]">
                            {sizeOptions.map((sz) => {
                                const isSelected = selectedSize === sz.label;
                                return (
                                    <button
                                        key={sz.label}
                                        type="button"
                                        onClick={() => setSelectedSize(sz.label)}
                                        aria-pressed={isSelected}
                                        className={`min-h-[56px] py-2.5 px-2 rounded-[12px] text-center transition-colors cursor-pointer ${
                                            isSelected ? 'bg-[#7B1E2B] text-[#F3EBDD]' : 'text-[#B5AEA3] hover:text-[#F3EBDD]'
                                        }`}
                                    >
                                        <div className="text-sm">{t(`size.${sz.label}`, null, sz.label)}</div>
                                        <div className="font-heading text-base mt-0.5 text-[#F3EBDD] tabular-nums">{formatPrice(sz.price)}</div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {product.ingredients && (
                        <div>
                            <h4 className="font-heading text-lg text-[#F3EBDD] mb-1">{t('detail.ingredients')}</h4>
                            <p className="text-sm text-[#B5AEA3] leading-relaxed">{product.ingredients}</p>
                        </div>
                    )}

                    {/* Alerjen etiketleri (vejetaryen etiketi bunlardan ayrı, yukarıda) */}
                    {allergens.length > 0 && (
                        <div>
                            <h4 className="font-heading text-lg text-[#F3EBDD] mb-2">{t('detail.allergens')}</h4>
                            <div className="flex flex-wrap gap-2">
                                {allergens.map((alg) => (
                                    <span
                                        key={alg}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6E6B45]/45 text-[#F3EBDD] text-sm"
                                    >
                                        <AllergenIcon name={alg} className="w-4 h-4" />
                                        <span>{t(`allergen.${alg}`, null, alg)}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Kalori: porsiyon ve dilim başına; "Değerler yaklaşıktır" kartın altında */}
                    {product.calories && (product.calories.portion || product.calories.slice) && (
                        <div>
                            <div className="bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] rounded-[16px] p-4 flex items-center gap-4">
                                <div className="w-11 h-11 rounded-full border border-[#A6A277]/60 flex items-center justify-center text-[#A6A277] shrink-0">
                                    <Flame className="w-5 h-5" />
                                </div>
                                <div className="flex-1 grid grid-cols-2 divide-x divide-[#F3EBDD]/10">
                                    {product.calories.portion != null && (
                                        <div className="pr-3">
                                            <div className="text-xs text-[#B5AEA3]">{t('detail.portion')}</div>
                                            <div className="font-heading text-lg text-[#F3EBDD] tabular-nums">{product.calories.portion} kcal</div>
                                        </div>
                                    )}
                                    {product.calories.slice != null && (
                                        <div className="pl-3">
                                            <div className="text-xs text-[#B5AEA3]">{t('detail.slice')}</div>
                                            <div className="font-heading text-lg text-[#F3EBDD] tabular-nums">{product.calories.slice} kcal</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-xs text-[#B5AEA3]/70 mt-1.5 ml-1">{t('detail.approx')}</div>
                        </div>
                    )}

                    {/* Not alanı */}
                    <div>
                        <label htmlFor="product-note" className="block font-heading text-lg text-[#F3EBDD] mb-2">
                            {t('detail.note')}
                        </label>
                        <input
                            id="product-note"
                            type="text"
                            maxLength={200}
                            placeholder={t('detail.notePlaceholder')}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-12 px-4 bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] rounded-[14px] text-sm text-[#F3EBDD] placeholder-[#B5AEA3]/50 focus:outline-none focus:border-[#6E6B45]"
                        />
                    </div>
                </div>

                {/* Adet + "Sepete ekle · ₺X" */}
                <div className="sticky bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-[#141312]/95 backdrop-blur-md border-t border-[#F3EBDD]/10 mt-auto flex items-center gap-3">
                    <div className="flex items-center gap-1 p-1 bg-[#1E1C1A] border border-[#F3EBDD]/10 rounded-full">
                        <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            aria-label={t('qty.dec')}
                            className="w-11 h-11 rounded-full flex items-center justify-center text-[#F3EBDD] hover:bg-[#252320] cursor-pointer"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-heading text-base w-6 text-center tabular-nums">{quantity}</span>
                        <button
                            type="button"
                            onClick={() => setQuantity(Math.min(20, quantity + 1))}
                            aria-label={t('qty.inc')}
                            className="w-11 h-11 rounded-full flex items-center justify-center text-[#F3EBDD] hover:bg-[#252320] cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={addedSuccess}
                        className={`flex-1 h-[52px] px-5 rounded-full text-[15px] font-semibold flex items-center justify-center shadow-xl transition-colors cursor-pointer tabular-nums ${
                            addedSuccess
                                ? 'bg-[#6E6B45] text-[#F3EBDD]'
                                : 'bg-[#7B1E2B] hover:bg-[#9A2A38] active:bg-[#9A2A38] text-[#F3EBDD] shadow-[#7B1E2B]/40'
                        }`}
                    >
                        {addedSuccess ? t('detail.added') : t('detail.add', { price: formatPrice(currentPrice * quantity) })}
                    </button>
                </div>
            </div>
        </div>
    );
};
