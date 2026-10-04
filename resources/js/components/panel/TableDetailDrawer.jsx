import React, { useState } from 'react';
import { X, Plus, CreditCard, Banknote, ArrowRightLeft, Split, Check, MoreHorizontal, Minus } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { formatPrice } from '../../productImage';

const STATUS_LABELS = { approved: 'Mutfağa iletildi', preparing: 'Hazırlanıyor', ready: 'Hazır', served: 'Servis edildi' };

export const TableDetailDrawer = ({ table, tables = [], onClose, onRefresh, onOpenAddProduct }) => {
    const [panel, setPanel] = useState(null); // null | 'pay' | 'other' | 'move' | 'split'
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [people, setPeople] = useState(2);
    const [cashPeople, setCashPeople] = useState(1);

    const items = table.items || [];
    const total = table.totalAmount || 0;
    const hasBill = items.length > 0;
    const emptyTables = tables.filter((t) => t.status === 'bos' && t.id !== table.id);

    const run = async (fn) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
            await onRefresh();
            return true;
        } catch (err) {
            setError(errorMessage(err, 'İşlem yapılamadı.'));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const handleCheckout = async (method, cashAmount = null) => {
        const ok = await run(() => apiService.checkoutTable(table.name, method, cashAmount));
        if (ok) onClose();
    };

    // Hesap bölme: kişilerin bir kısmı nakit, kalanı kartla öder; tutarlar ayrı kaydedilir
    const cashPeopleSafe = Math.min(cashPeople, people);
    const cardPeople = people - cashPeopleSafe;
    const cashShare = Math.round((total * cashPeopleSafe * 100) / people) / 100;
    const handleSplitCheckout = () =>
        handleCheckout(cardPeople === 0 ? 'cash' : cashPeopleSafe === 0 ? 'credit_card' : 'mixed', cashShare);

    const handleMove = async (target) => {
        if (!confirm(`${table.name} → ${target.name} taşınsın mı?`)) return;
        const ok = await run(() => apiService.moveTable(table.name, target.name));
        if (ok) onClose();
    };

    const toggle = (name) => setPanel((p) => (p === name ? null : name));

    return (
        <div className="fixed inset-0 z-50 bg-[#0D0C0B]/70 flex justify-end" onClick={onClose}>
            <div
                className="w-full md:max-w-md bg-[#171513] border-l border-[#6E6B45]/30 h-full flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Başlık */}
                <div className="p-4 pl-5 border-b border-[#6E6B45]/30 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="font-heading text-xl tracking-wide uppercase text-[#F3EBDD]">{table.name}</h2>
                        <p className="text-sm text-[#A6A277] mt-0.5">
                            {table.status === 'ilgilen' && table.alertReason ? `${table.alertReason} · ` : ''}
                            {hasBill ? `${table.durationMinutes} dakikadır açık` : 'Açık hesap yok'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="min-h-[44px] px-3 rounded-[12px] bg-[#0D0C0B] border border-[#6E6B45]/30 flex items-center gap-1.5 text-sm text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                        Kapat
                    </button>
                </div>

                {/* Ürün satırları: her satırda kaynak (QR / Garson) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {table.pendingOrderCount > 0 && (
                        <div className="px-3 py-2.5 rounded-[12px] border border-[#9A2A38]/70 text-sm text-[#F3EBDD]">
                            {table.pendingOrderCount} QR sipariş onay bekliyor (Bekleyenler sütunundan onaylayın).
                        </div>
                    )}

                    {!hasBill ? (
                        <div className="text-center py-16 text-sm text-[#B5AEA3]">Bu masada henüz ürün yok.</div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="bg-[#0D0C0B] border border-[#6E6B45]/25 rounded-[12px] px-3.5 py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[15px] font-semibold text-[#F3EBDD]">
                                            {item.quantity}× {item.name}
                                        </span>
                                        <span className="text-xs text-[#B5AEA3]">{item.size}</span>
                                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[6px] border border-[#F3EBDD]/15 text-[#B5AEA3]">
                                            {item.source}
                                        </span>
                                    </div>
                                    {item.notes && <p className="text-xs text-[#B5AEA3] mt-1">Not: {item.notes}</p>}
                                    <p className="text-xs text-[#A6A277] mt-1">{STATUS_LABELS[item.status] || ''}</p>
                                </div>
                                <div className="text-[15px] font-semibold text-[#F3EBDD] tabular-nums shrink-0">
                                    {formatPrice(item.price * item.quantity)}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Alt: toplam + Ürün ekle / Diğer / Hesabı kapat */}
                <div className="p-4 border-t border-[#6E6B45]/30 space-y-3">
                    {error && (
                        <div className="px-3 py-2.5 rounded-[12px] bg-[#0D0C0B] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">{error}</div>
                    )}

                    {/* Diğer: seyrek işlemler */}
                    {panel === 'other' && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPanel('move')}
                                disabled={!hasBill}
                                className="min-h-[48px] rounded-[12px] bg-[#0D0C0B] hover:bg-[#201E1B] border border-[#6E6B45]/35 text-sm text-[#F3EBDD] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                            >
                                <ArrowRightLeft className="w-4 h-4 text-[#A6A277]" />
                                Masa taşı
                            </button>
                            <button
                                onClick={() => setPanel('split')}
                                disabled={!hasBill}
                                className="min-h-[48px] rounded-[12px] bg-[#0D0C0B] hover:bg-[#201E1B] border border-[#6E6B45]/35 text-sm text-[#F3EBDD] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                            >
                                <Split className="w-4 h-4 text-[#A6A277]" />
                                Hesap böl
                            </button>
                        </div>
                    )}

                    {panel === 'move' && (
                        <div className="space-y-2">
                            <p className="text-sm text-[#B5AEA3]">Hedef masayı seçin (yalnızca boş masalar):</p>
                            {emptyTables.length === 0 ? (
                                <p className="text-sm text-[#F3EBDD]">Boş masa yok.</p>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                    {emptyTables.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleMove(t)}
                                            disabled={busy}
                                            className="min-h-[44px] rounded-[12px] bg-[#0D0C0B] hover:bg-[#201E1B] border border-[#6E6B45]/35 text-sm text-[#F3EBDD] cursor-pointer disabled:opacity-50"
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {panel === 'split' && (
                        <div className="rounded-[12px] bg-[#0D0C0B] border border-[#6E6B45]/35 p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPeople(Math.max(2, people - 1))}
                                    className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[#F3EBDD] hover:bg-[#201E1B] cursor-pointer"
                                    aria-label="Kişi azalt"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-[#F3EBDD] w-16 text-center tabular-nums">{people} kişi</span>
                                <button
                                    onClick={() => setPeople(Math.min(20, people + 1))}
                                    className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[#F3EBDD] hover:bg-[#201E1B] cursor-pointer"
                                    aria-label="Kişi artır"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-[#B5AEA3]">Kişi başı</div>
                                <div className="text-lg font-semibold text-[#F3EBDD] tabular-nums">
                                    ₺{(total / people).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    )}

                    {panel === 'split' && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-[12px] bg-[#0D0C0B] border border-[#6E6B45]/35 p-2.5">
                                    <div className="flex items-center gap-1.5 text-sm text-[#F3EBDD] px-1">
                                        <Banknote className="w-4 h-4 text-[#A6A277]" />
                                        Nakit
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <button
                                            onClick={() => setCashPeople(Math.max(0, cashPeopleSafe - 1))}
                                            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[#F3EBDD] hover:bg-[#201E1B] cursor-pointer"
                                            aria-label="Nakit azalt"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm text-[#F3EBDD] tabular-nums">{cashPeopleSafe} kişi</span>
                                        <button
                                            onClick={() => setCashPeople(Math.min(people, cashPeopleSafe + 1))}
                                            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[#F3EBDD] hover:bg-[#201E1B] cursor-pointer"
                                            aria-label="Nakit artır"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="text-right text-[15px] font-semibold text-[#F3EBDD] tabular-nums px-1">{formatPrice(cashShare)}</div>
                                </div>
                                <div className="rounded-[12px] bg-[#0D0C0B] border border-[#6E6B45]/35 p-2.5 flex flex-col">
                                    <div className="flex items-center gap-1.5 text-sm text-[#F3EBDD] px-1">
                                        <CreditCard className="w-4 h-4 text-[#A6A277]" />
                                        Kredi kartı
                                    </div>
                                    <div className="flex-1 flex items-center justify-center min-h-10 mt-1 text-sm text-[#F3EBDD] tabular-nums">{cardPeople} kişi</div>
                                    <div className="text-right text-[15px] font-semibold text-[#F3EBDD] tabular-nums px-1">{formatPrice(total - cashShare)}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleSplitCheckout}
                                disabled={busy}
                                className="w-full min-h-[48px] rounded-[12px] bg-[#6E6B45] hover:bg-[#7d7a50] text-sm font-semibold text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" />
                                Hesabı kapat
                            </button>
                        </div>
                    )}

                    {panel === 'pay' && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleCheckout('cash')}
                                disabled={busy}
                                className="min-h-[48px] rounded-[12px] bg-[#0D0C0B] hover:bg-[#201E1B] border border-[#6E6B45]/35 text-sm font-semibold text-[#F3EBDD] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <Banknote className="w-4 h-4 text-[#A6A277]" />
                                Nakit
                            </button>
                            <button
                                onClick={() => handleCheckout('credit_card')}
                                disabled={busy}
                                className="min-h-[48px] rounded-[12px] bg-[#0D0C0B] hover:bg-[#201E1B] border border-[#6E6B45]/35 text-sm font-semibold text-[#F3EBDD] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <CreditCard className="w-4 h-4 text-[#A6A277]" />
                                Kredi kartı
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm text-[#B5AEA3]">Toplam</span>
                        <span className="text-2xl font-semibold text-[#F3EBDD] tabular-nums">{formatPrice(total)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => onOpenAddProduct(table)}
                            className="min-h-[48px] rounded-[12px] bg-[#201E1B] hover:bg-[#2B2824] border border-[#6E6B45]/35 text-sm font-semibold text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="w-4 h-4 text-[#A6A277]" />
                            Ürün ekle
                        </button>
                        <button
                            onClick={() => toggle('other')}
                            className={`min-h-[48px] rounded-[12px] border text-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                                ['other', 'move', 'split'].includes(panel)
                                    ? 'bg-[#2B2824] border-[#F3EBDD]/25 text-[#F3EBDD]'
                                    : 'bg-[#201E1B] hover:bg-[#2B2824] border-[#6E6B45]/35 text-[#B5AEA3]'
                            }`}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                            Diğer
                        </button>
                        <button
                            onClick={() => toggle('pay')}
                            disabled={!hasBill || busy}
                            className="min-h-[48px] rounded-[12px] bg-[#6E6B45] hover:bg-[#7d7a50] text-sm font-semibold text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                        >
                            <Check className="w-4 h-4" />
                            Hesabı kapat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
