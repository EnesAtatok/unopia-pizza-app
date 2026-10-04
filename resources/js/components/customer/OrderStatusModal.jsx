import React, { useEffect } from 'react';
import { ArrowLeft, Check, Send, ChefHat, XCircle, Bell, HandPlatter } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../productImage';

// Mutfak ekranındaki adımlarla birebir: Gönderildi → Onaylandı → Hazırlanıyor → Hazır → Servis edildi
const STEPS = [
    { status: 'pending', title: 'Gönderildi', desc: 'Garson onayı bekleniyor', icon: Send },
    { status: 'approved', title: 'Onaylandı', desc: 'Siparişiniz mutfağa iletildi', icon: Check },
    { status: 'preparing', title: 'Hazırlanıyor', desc: 'Siparişiniz fırında', icon: ChefHat },
    { status: 'ready', title: 'Hazır', desc: 'Masanıza getiriliyor', icon: Bell },
    { status: 'served', title: 'Servis edildi', desc: 'Afiyet olsun!', icon: HandPlatter },
];

const stepIndexFor = (status) => Math.max(0, STEPS.findIndex((s) => s.status === status));

export const OrderStatusModal = ({ onClose }) => {
    const { activeOrder, setActiveOrder, refreshActiveOrder } = useCart();

    // Pencere açılınca durumu beklemeden tazele
    useEffect(() => {
        refreshActiveOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!activeOrder) return null;

    const status = activeOrder.status || 'pending';
    const isRejected = status === 'rejected';
    const current = stepIndexFor(status);
    const allDone = status === 'served'; // son adım tamamlandı: hepsi onaylı görünür

    const dismissRejected = () => {
        setActiveOrder(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#141312]/80 backdrop-blur-sm flex flex-col justify-end max-w-[430px] mx-auto">
            <div className="bg-[#141312] border-t border-[#F3EBDD]/10 rounded-t-[28px] max-h-[90dvh] overflow-y-auto no-scrollbar flex flex-col p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-3 mb-5">
                    <button
                        onClick={onClose}
                        aria-label="Menüye dön"
                        className="w-11 h-11 rounded-full bg-[#1E1C1A] border border-[#F3EBDD]/10 flex items-center justify-center text-[#F3EBDD] cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-heading text-lg tracking-wide text-[#F3EBDD] uppercase leading-none">Siparişim</h2>
                        <p className="text-xs text-[#A6A277] mt-1">
                            {activeOrder.table_number} · Sipariş #{activeOrder.id}
                        </p>
                    </div>
                </div>

                {isRejected ? (
                    <div className="bg-[#1E1C1A] border border-[#9A2A38]/60 rounded-[16px] p-5 mb-5 flex gap-3">
                        <XCircle className="w-6 h-6 text-[#9A2A38] shrink-0" />
                        <div>
                            <h3 className="text-[15px] font-semibold text-[#F3EBDD]">Sipariş onaylanmadı</h3>
                            <p className="text-sm text-[#B5AEA3] mt-1 leading-relaxed">
                                Garsonumuz siparişinizi onaylayamadı (ör. ürün kalmamış olabilir). Masanıza gelip bilgi verecek.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] rounded-[16px] p-5 mb-5">
                        <ol className="space-y-5 relative before:absolute before:left-[21px] before:top-5 before:bottom-5 before:w-px before:bg-[#F3EBDD]/12">
                            {STEPS.map((st, i) => {
                                const isDone = i < current || allDone;
                                const isCurrent = i === current && !allDone;
                                const Icon = st.icon;
                                return (
                                    <li key={st.status} className="flex items-center gap-4 relative z-10">
                                        <div
                                            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                                isDone
                                                    ? 'bg-[#6E6B45] text-[#F3EBDD]'
                                                    : isCurrent
                                                    ? 'bg-[#7B1E2B] text-[#F3EBDD] shadow-lg shadow-[#7B1E2B]/40'
                                                    : 'bg-[#141312] border border-[#F3EBDD]/15 text-[#B5AEA3]/50'
                                            }`}
                                        >
                                            {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className={`text-[15px] font-semibold ${isDone || isCurrent ? 'text-[#F3EBDD]' : 'text-[#B5AEA3]/60'}`}>
                                                {st.title}
                                            </h4>
                                            <p className="text-xs text-[#B5AEA3] mt-0.5">{st.desc}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                )}

                {/* Sipariş özeti */}
                <div className="bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] rounded-[16px] p-5 space-y-3 mb-5">
                    <h3 className="text-xs font-semibold text-[#A6A277] uppercase tracking-wider">Sipariş Özeti</h3>
                    <div className="space-y-2.5">
                        {activeOrder.items?.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                                <div className="min-w-0">
                                    <span className="text-[#F3EBDD]">
                                        {item.quantity}× {item.product?.name || 'Ürün'}
                                    </span>
                                    <span className="text-[#A6A277] ml-1.5">{item.size}</span>
                                    {item.notes && <div className="text-xs text-[#B5AEA3]">Not: {item.notes}</div>}
                                </div>
                                <span className="text-[#F3EBDD] tabular-nums shrink-0">
                                    {formatPrice(Number(item.price) * item.quantity)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-3 border-t border-[#F3EBDD]/10 flex items-center justify-between">
                        <span className="text-sm text-[#B5AEA3]">Toplam</span>
                        <span className="font-heading text-lg text-[#F3EBDD] tabular-nums">{formatPrice(activeOrder.total_amount)}</span>
                    </div>
                    <p className="text-xs text-[#B5AEA3]/80">Ödeme masada yapılır.</p>
                </div>

                <button
                    onClick={isRejected ? dismissRejected : onClose}
                    className="w-full h-12 rounded-full bg-[#1E1C1A] hover:bg-[#252320] border border-[#F3EBDD]/15 text-[#F3EBDD] text-sm font-medium transition-colors cursor-pointer"
                >
                    {isRejected ? 'Tamam' : 'Menüye dön'}
                </button>
            </div>
        </div>
    );
};
