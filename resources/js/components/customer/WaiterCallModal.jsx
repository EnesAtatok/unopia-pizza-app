import React, { useState } from 'react';
import { ArrowLeft, Bell, CheckCircle2, Clock } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { apiService, errorMessage as apiError } from '../../api';
import { useLang } from '../../i18n/LangContext';
import { tableLabel } from '../../i18n/localize';

export const WaiterCallModal = ({ onClose }) => {
    const { tableNumber, tableToken, waiterCallTime, triggerWaiterCall } = useCart();
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const isLocked = waiterCallTime && Date.now() - waiterCallTime < 180000;

    const { t } = useLang();
    // Panele Türkçe sebep gider (personel Türkçe okur); müşteri kendi dilinde görür
    const reasons = [
        { key: 'order', value: 'Sipariş vermek istiyorum' },
        { key: 'bill', value: 'Hesabı istiyorum' },
        { key: 'other', value: 'Başka bir konu' },
    ];

    // Masa yalnızca masadaki QR koddan gelir; QR okutulmadan garson çağrılamaz
    const handleCall = async (reason) => {
        if (isLocked || !tableToken) return;
        const token = tableToken;
        setSubmitting(true);
        setErrorMessage(null);

        try {
            await apiService.callWaiter({
                table_token: token,
                reason: reason,
            });

            triggerWaiterCall();
            setSuccessMessage(t('waiter.coming'));
            setTimeout(() => {
                onClose();
            }, 1800);
        } catch (err) {
            setErrorMessage(apiError(err, t('waiter.error')));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#141312]/90 backdrop-blur-md flex flex-col justify-end max-w-[430px] mx-auto">
            <div className="bg-[#141312] border-t border-[#F3EBDD]/10 rounded-t-[28px] max-h-[80vh] overflow-y-auto no-scrollbar p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#F3EBDD]/10">
                    <button
                        onClick={onClose}
                        aria-label={t('cart.backToMenu')}
                        className="w-11 h-11 rounded-full bg-[#1E1C1A] border border-[#F3EBDD]/10 flex items-center justify-center text-[#F3EBDD] cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-heading text-lg font-black tracking-wide text-[#F3EBDD] uppercase">
                            {t('waiter.call')}
                        </h2>
                        <p className="text-xs text-[#A6A277]">{tableLabel(tableNumber, t)}</p>
                    </div>
                </div>

                {successMessage ? (
                    <div className="bg-[#1E1C1A] border border-[#6E6B45]/50 rounded-[16px] p-6 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-[#A6A277] mx-auto" />
                        <h3 className="font-heading text-base font-bold text-[#F3EBDD]">
                            {successMessage}
                        </h3>
                        <p className="text-xs text-[#B5AEA3]">
                            {t('waiter.successText')}
                        </p>
                    </div>
                ) : isLocked ? (
                    <div className="bg-[#1E1C1A] border border-[#6E6B45]/40 rounded-[16px] p-6 text-center space-y-3">
                        <Clock className="w-12 h-12 text-[#A6A277] mx-auto" />
                        <h3 className="font-heading text-base font-bold text-[#F3EBDD]">
                            {t('waiter.coming')}
                        </h3>
                        <p className="text-xs text-[#B5AEA3]">
                            {t('waiter.lockedText')}
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-2 h-11 px-8 rounded-full bg-[#7B1E2B] hover:bg-[#9A2A38] text-sm font-semibold text-[#F3EBDD] cursor-pointer"
                        >
                            {t('common.ok')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-[#B5AEA3]">
                            {t('waiter.prompt')}
                        </p>

                        {errorMessage && (
                            <p className="text-xs text-red-300 bg-[#7B1E2B]/20 border border-[#7B1E2B]/50 rounded-[12px] px-3 py-2">
                                {errorMessage}
                            </p>
                        )}

                        <div className="space-y-2.5">
                            {reasons.map((reason) => (
                                <button
                                    key={reason.key}
                                    type="button"
                                    onClick={() => handleCall(reason.value)}
                                    disabled={submitting || !tableToken}
                                    className="w-full py-4 px-5 rounded-[16px] bg-[#1E1C1A] hover:bg-[#252320] border border-[#F3EBDD]/8 hover:border-[#6E6B45] text-left text-sm font-medium text-[#F3EBDD] flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#141312] border border-[#F3EBDD]/10 flex items-center justify-center text-[#A6A277] group-hover:text-[#F3EBDD]">
                                            <Bell className="w-4 h-4" />
                                        </div>
                                        <span>{t(`waiter.reasons.${reason.key}`)}</span>
                                    </div>
                                    <span className="text-xs text-[#A6A277] group-hover:translate-x-1 transition-transform">
                                        →
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
