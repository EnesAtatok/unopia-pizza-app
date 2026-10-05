import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Trash2, Plus, Minus, Info } from 'lucide-react';
import { useCart, MAX_LINE_QTY } from '../../context/CartContext';
import { apiService, errorMessage as apiError } from '../../api';
import { formatPrice, productDisplayName } from '../../productImage';
import { useLang } from '../../i18n/LangContext';
import { localizeProduct, tableLabel } from '../../i18n/localize';

const newClientRef = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const CartModal = ({ onClose, onOrderSuccess, onMenuChanged }) => {
    const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, tableNumber, tableToken, pricesUpdated, dismissPricesUpdated } = useCart();
    const { lang, t } = useLang();
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    // Gönderim kilidi state'ten önce devreye girer: art arda dokunuşta ikinci istek çıkmaz
    const sendingRef = useRef(false);
    // Aynı sepetin tekrar gönderimi (ağ hatası sonrası deneme) sunucuda aynı sipariş sayılır
    const clientRef = useRef(newClientRef());

    // Sepet açılınca menü tazelenir: fiyat ve "Tükendi" durumu güncel olsun
    useEffect(() => {
        onMenuChanged?.();
        return () => dismissPricesUpdated();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Masa yalnızca masadaki QR koddan gelir; QR okutulmadan sipariş gönderilemez
    const handleSendOrder = async () => {
        if (cart.length === 0 || sendingRef.current || !tableToken) return;
        sendingRef.current = true;
        setSubmitting(true);
        setErrorMessage(null);

        try {
            const response = await apiService.createOrder({
                table_token: tableToken,
                client_ref: clientRef.current,
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    size: item.size,
                    notes: item.notes || null,
                })),
            });
            clientRef.current = newClientRef();
            clearCart();
            onOrderSuccess(response.data);
        } catch (error) {
            setErrorMessage(apiError(error, t('cart.sendError')));
            // Ürün tükenmiş ya da fiyat değişmiş olabilir: menüyü tazele
            if (error.response?.status === 422) onMenuChanged?.();
        } finally {
            sendingRef.current = false;
            setSubmitting(false);
        }
    };

    // Sepet içeriği değişirse bu artık yeni bir sipariştir
    useEffect(() => {
        if (!sendingRef.current) clientRef.current = newClientRef();
    }, [cart]);

    return (
        <div className="fixed inset-0 z-50 bg-[#141312]/80 backdrop-blur-sm flex flex-col justify-end max-w-[430px] mx-auto">
            <div className="bg-[#141312] border-t border-[#F3EBDD]/10 rounded-t-[28px] max-h-[92dvh] overflow-y-auto no-scrollbar flex flex-col">
                {/* Başlık */}
                <div className="p-4 pl-5 border-b border-[#F3EBDD]/10 flex items-center justify-between sticky top-0 bg-[#141312] z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            aria-label={t('cart.backToMenu')}
                            className="w-11 h-11 rounded-full bg-[#1E1C1A] border border-[#F3EBDD]/10 flex items-center justify-center text-[#F3EBDD] cursor-pointer"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="font-heading text-lg tracking-wide text-[#F3EBDD] uppercase leading-none">{t('cart.title')}</h2>
                            {tableNumber && <p className="text-xs text-[#A6A277] mt-1">{tableLabel(tableNumber, t)}</p>}
                        </div>
                    </div>

                    {cart.length > 0 && (
                        <button onClick={clearCart} className="h-11 px-3 text-sm text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer">
                            {t('cart.clear')}
                        </button>
                    )}
                </div>

                {/* Ürün satırları: boy, not, adet */}
                <div className="p-4 flex-1 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center py-16 text-[#B5AEA3]">
                            <p className="text-sm">{t('cart.empty')}</p>
                            <button
                                onClick={onClose}
                                className="mt-4 h-11 px-6 rounded-full bg-[#1E1C1A] border border-[#6E6B45]/50 text-[#A6A277] text-sm font-medium cursor-pointer"
                            >
                                {t('cart.emptyBack')}
                            </button>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div
                                key={`${item.product.id}-${item.size}-${item.notes}-${index}`}
                                className="bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] rounded-[16px] p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h4 className="font-heading text-[15px] text-[#F3EBDD] leading-tight">{productDisplayName(localizeProduct(item.product, lang).name)}</h4>
                                        <div className="text-xs text-[#A6A277] mt-1">{t(`size.${item.size}`, null, item.size)}</div>
                                        {item.notes && <p className="text-xs text-[#B5AEA3] mt-1">{t('common.note', { note: item.notes })}</p>}
                                    </div>
                                    <div className="font-heading text-[15px] text-[#F3EBDD] tabular-nums shrink-0">
                                        {formatPrice(item.price * item.quantity)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-1 p-1 bg-[#141312] border border-[#F3EBDD]/10 rounded-full">
                                        <button
                                            onClick={() => updateQuantity(index, -1)}
                                            aria-label={t('qty.dec')}
                                            className="w-11 h-11 rounded-full flex items-center justify-center text-[#F3EBDD] hover:bg-[#252320] cursor-pointer"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="font-heading text-sm w-6 text-center tabular-nums">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(index, 1)}
                                            disabled={item.quantity >= MAX_LINE_QTY}
                                            aria-label={t('qty.inc')}
                                            className="w-11 h-11 rounded-full flex items-center justify-center text-[#F3EBDD] hover:bg-[#252320] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(index)}
                                        className="h-11 px-3 flex items-center gap-1.5 text-sm text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {t('cart.remove')}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Bilgi kutusu: önce garson onayı, ödeme masada */}
                    {cart.length > 0 && (
                        <div className="bg-[#1E1C1A] border border-[#6E6B45]/40 rounded-[16px] p-4 flex gap-3 text-sm text-[#B5AEA3] leading-relaxed">
                            <Info className="w-5 h-5 text-[#A6A277] shrink-0 mt-0.5" />
                            <p>
                                {t('cart.info')[0]}
                                <strong className="text-[#F3EBDD] font-semibold">{t('cart.info')[1]}</strong>
                                {t('cart.info')[2]}
                                <strong className="text-[#F3EBDD] font-semibold">{t('cart.info')[3]}</strong>
                                {t('cart.info')[4]}
                            </p>
                        </div>
                    )}

                    {pricesUpdated && cart.length > 0 && (
                        <div role="status" className="p-3 bg-[#1E1C1A] border border-[#A6A277]/60 rounded-[14px] text-sm text-[#F3EBDD]">
                            {t('cart.pricesUpdated')}
                        </div>
                    )}

                    {errorMessage && (
                        <div role="alert" className="p-3 bg-[#7B1E2B]/20 border border-[#9A2A38]/60 rounded-[14px] text-sm text-[#F3EBDD]">
                            {errorMessage}
                        </div>
                    )}
                </div>

                {/* Toplam + Siparişi gönder */}
                {cart.length > 0 && (
                    <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#F3EBDD]/10 bg-[#141312] space-y-3 sticky bottom-0">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-sm text-[#B5AEA3]">{t('common.total')}</span>
                            <span className="font-heading text-xl text-[#F3EBDD] tabular-nums">{formatPrice(cartTotal)}</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleSendOrder}
                            disabled={submitting || !tableToken}
                            className="w-full h-[52px] px-6 rounded-full bg-[#7B1E2B] hover:bg-[#9A2A38] active:bg-[#9A2A38] text-[#F3EBDD] text-[15px] font-semibold transition-colors flex items-center justify-center gap-2 shadow-xl shadow-[#7B1E2B]/40 cursor-pointer disabled:opacity-60"
                        >
                            {submitting ? t('cart.sending') : t('cart.send')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
