import React, { useState } from 'react';
import { ArrowLeft, Flame, ChefHat, Plus } from 'lucide-react';
import { AllergenIcon, VegetarianLeafIcon, HeroDrips } from '../common/Icons';
import { getSizeOptions, getDefaultSize, priceForSize, extraPriceForSize, isPiecePricing, formatPrice, productDisplayName } from '../../productImage';
import { sizeOptionName } from '../../i18n/localize';
import { ProductPhoto } from './ProductPhoto';
import { useLang } from '../../i18n/LangContext';

export const ProductDetailModal = ({ product, extras = [], onClose }) => {
    const { t, lang } = useLang();

    const [selectedSize, setSelectedSize] = useState(() => getDefaultSize(product));

    // Yalnızca ürün için tanımlı boylar gösterilir (tek boylu üründe seçici gizlenir).
    const sizeOptions = getSizeOptions(product);
    const currentPrice = priceForSize(product, selectedSize);
    const allergens = Array.isArray(product.allergens) ? product.allergens : [];
    // Boş veya 0 girilen kalori gösterilmez
    const hasPortionKcal = Number(product.calories?.portion) > 0;
    const hasSliceKcal = Number(product.calories?.slice) > 0;

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

                <div className="p-6 pt-9 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6">
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

                        {/* Kısa açıklama malzemelerle aynıysa aşağıda "Malzemeler" altında bir kez gösterilir */}
                        {product.description && product.description !== product.ingredients && (
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
                                        <div className="text-sm">{sizeOptionName(sz, t, lang)}</div>
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

                    {/* İlaveler: fiyatlar seçili boya göre (küçük ×1, orta ×2, büyük ×3) */}
                    {extras.length > 0 && (
                        <div>
                            <div className="flex items-baseline justify-between gap-3 mb-2">
                                <h4 className="font-heading text-lg text-[#F3EBDD]">{t('detail.extras')}</h4>
                                {sizeOptions.length > 1 && !isPiecePricing(product) && (
                                    <span className="text-xs text-[#B5AEA3]">
                                        {t('detail.extrasHint', { size: t(`size.${selectedSize}`, null, selectedSize) })}
                                    </span>
                                )}
                            </div>
                            <ul className="rounded-[16px] bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] divide-y divide-[#F3EBDD]/[0.06]">
                                {extras.map((ex) => (
                                    <li key={ex.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                        <span className="flex items-center gap-2.5 min-w-0 text-sm text-[#D9D1C3]">
                                            <Plus className="w-3.5 h-3.5 text-[#A6A277] shrink-0" aria-hidden="true" />
                                            <span className="[overflow-wrap:anywhere]">{ex.name}</span>
                                        </span>
                                        <span className="font-heading text-base text-[#F3EBDD] tabular-nums shrink-0">
                                            +{formatPrice(extraPriceForSize(ex, product, selectedSize))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Şefin önerisi: ürünün yanında iyi gidecek ek ürün / malzeme */}
                    {product.chef_note && (
                        <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-r from-[#3A141A] to-[#1E1C1A] border border-[#9A2A38]/50 p-4 flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-full bg-[#7B1E2B] ring-2 ring-[#9A2A38]/40 flex items-center justify-center text-[#F3EBDD] shrink-0">
                                <ChefHat className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 font-heading text-lg text-[#F3EBDD] leading-tight">
                                    {t('detail.chefPick')}
                                    <Flame className="w-4 h-4 text-[#E8A15A]" aria-hidden="true" />
                                </div>
                                <p className="text-sm text-[#D9D1C3] leading-relaxed mt-0.5 [overflow-wrap:anywhere]">{product.chef_note}</p>
                            </div>
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
                    {(hasPortionKcal || hasSliceKcal) && (
                        <div>
                            <div className="bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] rounded-[16px] p-4 flex items-center gap-4">
                                <div className="w-11 h-11 rounded-full border border-[#A6A277]/60 flex items-center justify-center text-[#A6A277] shrink-0">
                                    <Flame className="w-5 h-5" />
                                </div>
                                {/* Dilim kalorisi isteğe bağlı: girilmediyse yalnızca porsiyon tam genişlikte */}
                                <div className={`flex-1 grid ${hasPortionKcal && hasSliceKcal ? 'grid-cols-2 divide-x divide-[#F3EBDD]/10' : 'grid-cols-1'}`}>
                                    {hasPortionKcal && (
                                        <div className="pr-3">
                                            <div className="text-xs text-[#B5AEA3]">{t('detail.portion')}</div>
                                            <div className="font-heading text-lg text-[#F3EBDD] tabular-nums">{product.calories.portion} kcal</div>
                                        </div>
                                    )}
                                    {hasSliceKcal && (
                                        <div className={hasPortionKcal ? 'pl-3' : ''}>
                                            <div className="text-xs text-[#B5AEA3]">{t('detail.slice')}</div>
                                            <div className="font-heading text-lg text-[#F3EBDD] tabular-nums">{product.calories.slice} kcal</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-xs text-[#B5AEA3]/70 mt-1.5 ml-1">{t('detail.approx')}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
