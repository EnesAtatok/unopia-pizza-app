import React, { useState } from 'react';
import { Check, X, RefreshCw, ChevronRight, ClipboardCheck } from 'lucide-react';
import { DiningTableIcon, FlowLines } from '../common/Icons';
import { apiService, errorMessage } from '../../api';
import { formatPrice } from '../../productImage';

const SECTIONS = [
    { id: 'salon', label: 'Salon' },
    { id: 'bahce', label: 'Bahçe' },
];

const minutesAgo = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

// Masa kartı: solda durum şeridi, yuvarlak masa ikonu, ad, durum etiketi ve ok.
// Boş: haki · Dolu: bordo ton · İlgilen: bordo çerçeve + uyarı etiketi
const TableCard = ({ table, onSelect }) => {
    const isIlgilen = table.status === 'ilgilen';
    const isDolu = table.status === 'dolu';
    const isBusy = isIlgilen || isDolu;
    const hasAmount = table.totalAmount > 0;
    const amountText = `${formatPrice(table.totalAmount)} · ${table.durationMinutes} dk`;

    return (
        <button
            type="button"
            onClick={() => onSelect(table)}
            className={`group relative text-left rounded-[16px] min-h-[128px] pl-6 pr-4 py-5 flex items-center gap-4 overflow-hidden transition-all cursor-pointer hover:-translate-y-0.5 ${
                isIlgilen
                    ? 'bg-gradient-to-br from-[#4A1620] via-[#22100F] to-[#141210] border border-[#9A2A38] shadow-[0_10px_30px_rgba(123,30,43,0.25)]'
                    : isDolu
                    ? 'bg-gradient-to-br from-[#3A141A] via-[#1C1311] to-[#141210] border border-[#7B1E2B]/45 hover:border-[#9A2A38]/70'
                    : 'bg-gradient-to-br from-[#1C1A16] to-[#121110] border border-[#6E6B45]/25 hover:border-[#A6A277]/45'
            }`}
        >
            {/* Sol durum şeridi */}
            <span className={`absolute left-0 top-0 bottom-0 w-[5px] ${isBusy ? 'bg-[#9A2A38]' : 'bg-[#8A8659]'}`} aria-hidden="true" />
            {/* Kartın içinde hafif akış çizgileri */}
            <FlowLines tone={isBusy ? 'bordo' : 'khaki'} className="absolute right-0 bottom-0 w-3/4 h-2/3 opacity-60 pointer-events-none" />

            <span
                className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    isBusy ? 'bg-[#7B1E2B]/55 text-[#F3EBDD]' : 'bg-[#6E6B45]/45 text-[#EDE6D4]'
                }`}
            >
                <DiningTableIcon className="w-6 h-6" />
            </span>

            <div className="relative flex-1 min-w-0 flex flex-col items-start gap-2.5">
                <span className="text-lg font-medium text-[#F3EBDD] whitespace-nowrap leading-none">{table.name}</span>
                {isIlgilen ? (
                    <>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#9A2A38] text-[#F3EBDD] leading-tight">
                            {table.alertReason}
                        </span>
                        {hasAmount && <span className="text-xs text-[#D9D1C3] tabular-nums">{amountText}</span>}
                    </>
                ) : isDolu ? (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#7B1E2B]/80 text-[#F3EBDD] leading-tight tabular-nums">
                        {amountText}
                    </span>
                ) : (
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#2A2823] text-[#D9D1C3] leading-tight">Boş</span>
                )}
            </div>

            <ChevronRight className="relative w-5 h-5 text-[#B5AEA3] shrink-0 transition-transform group-hover:translate-x-0.5" />
        </button>
    );
};

const PendingColumn = ({ orders, calls, onAction, busy }) => {
    if (orders.length === 0 && calls.length === 0) {
        return (
            <div className="py-12 flex flex-col items-center text-center gap-4">
                <ClipboardCheck className="w-14 h-14 text-[#A6A277]" strokeWidth={1.3} />
                <span className="text-sm font-medium text-[#F3EBDD]">Bekleyen istek yok.</span>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {orders.length > 0 && (
                <section className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-[#A6A277] uppercase tracking-wider">Yeni siparişler</h3>
                    {orders.map((ord) => (
                        <div key={ord.id} className="bg-[#171513] border border-[#9A2A38]/70 rounded-[14px] p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-[15px] text-[#F3EBDD]">{ord.table_number}</span>
                                    <span className="text-xs text-[#B5AEA3]">{minutesAgo(ord.created_at)} dk önce</span>
                                </div>
                                <span className="font-semibold text-[15px] text-[#F3EBDD] tabular-nums">{formatPrice(ord.total_amount)}</span>
                            </div>

                            <ul className="text-sm text-[#F3EBDD] space-y-1.5">
                                {ord.items?.map((it) => (
                                    <li key={it.id}>
                                        <div className="flex justify-between gap-2">
                                            <span>
                                                {it.quantity}× {it.product?.name}
                                            </span>
                                            <span className="text-[#B5AEA3] shrink-0">{it.size}</span>
                                        </div>
                                        {it.notes && <div className="text-xs text-[#B5AEA3]">Not: {it.notes}</div>}
                                    </li>
                                ))}
                            </ul>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onAction('reject', ord)}
                                    disabled={busy === `order-${ord.id}`}
                                    className="min-h-[44px] rounded-[12px] bg-[#0D0C0B] hover:bg-[#201E1B] border border-[#6E6B45]/35 text-sm text-[#B5AEA3] hover:text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <X className="w-4 h-4" />
                                    Reddet
                                </button>
                                <button
                                    onClick={() => onAction('approve', ord)}
                                    disabled={busy === `order-${ord.id}`}
                                    className="min-h-[44px] rounded-[12px] bg-[#6E6B45] hover:bg-[#7d7a50] text-sm font-semibold text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" />
                                    Onayla
                                </button>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {calls.length > 0 && (
                <section className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-[#A6A277] uppercase tracking-wider">Garson çağrıları</h3>
                    {calls.map((call) => (
                        <div key={call.id} className="bg-[#171513] border border-[#9A2A38]/70 rounded-[14px] p-3.5 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-[15px] text-[#F3EBDD]">{call.table_number}</span>
                                <span className="text-xs text-[#B5AEA3]">{minutesAgo(call.created_at)} dk önce</span>
                            </div>
                            <div className="text-sm text-[#F3EBDD]">{call.reason}</div>
                            <button
                                onClick={() => onAction('resolve', call)}
                                disabled={busy === `call-${call.id}`}
                                className="w-full min-h-[44px] rounded-[12px] bg-[#201E1B] hover:bg-[#2B2824] border border-[#6E6B45]/35 text-sm font-semibold text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <Check className="w-4 h-4 text-[#A6A277]" />
                                Tamam, ilgileniyorum
                            </button>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
};

export const TablesScreen = ({ panelData, onSelectTable, onRefresh, loading, error }) => {
    const [section, setSection] = useState('salon');
    const [phoneView, setPhoneView] = useState('pending'); // telefon: 'pending' | 'tables'
    const [busy, setBusy] = useState(null);
    const [actionError, setActionError] = useState(null);

    const tables = panelData?.tables || [];
    const counts = panelData?.counts || { dolu: 0, bos: 0, bekliyor: 0 };
    const pendingOrders = panelData?.pending?.orders || [];
    const pendingCalls = panelData?.pending?.calls || [];
    const pendingTotal = pendingOrders.length + pendingCalls.length;
    const stockAlerts = panelData?.stock_alerts || [];
    const hasBahce = tables.some((t) => t.section === 'bahce');
    const visibleTables = hasBahce ? tables.filter((t) => t.section === section) : tables;

    const handleAction = async (action, item) => {
        if (action === 'reject' && !confirm(`${item.table_number} siparişini reddetmek istiyor musunuz? Sipariş mutfağa gitmez.`)) return;
        const key = action === 'resolve' ? `call-${item.id}` : `order-${item.id}`;
        setBusy(key);
        setActionError(null);
        try {
            if (action === 'approve') await apiService.approveOrder(item.id);
            if (action === 'reject') await apiService.rejectOrder(item.id);
            if (action === 'resolve') await apiService.resolveWaiterCall(item.id);
            await onRefresh();
        } catch (err) {
            setActionError(errorMessage(err, 'İşlem yapılamadı. Tekrar deneyin.'));
            onRefresh();
        } finally {
            setBusy(null);
        }
    };

    const tablesArea = (
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 md:space-y-6 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 md:pb-5 border-b border-[#6E6B45]/20">
                {hasBahce && (
                    <div className="flex items-center gap-1 bg-[#131210] p-1 rounded-[14px] border border-[#6E6B45]/35">
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSection(s.id)}
                                className={`min-h-[42px] px-7 rounded-[11px] text-sm transition-colors cursor-pointer ${
                                    section === s.id ? 'bg-gradient-to-b from-[#7A7750] to-[#5E5B3B] text-[#F3EBDD] font-semibold shadow-[0_4px_14px_rgba(110,107,69,0.35)]' : 'text-[#D9D1C3] hover:text-[#F3EBDD]'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Sayaçlar: dolu · boş · bekliyor */}
                <div className="flex items-center gap-3 text-sm text-[#B5AEA3] tabular-nums">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#9A2A38]" /><strong className="text-[#F3EBDD]">{counts.dolu}</strong> dolu</span>
                    <span className="text-[#F3EBDD]/25">·</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#8A8659]" /><strong className="text-[#F3EBDD]">{counts.bos}</strong> boş</span>
                    <span className="text-[#F3EBDD]/25">·</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F3EBDD]/70" /><strong className="text-[#F3EBDD]">{counts.bekliyor}</strong> bekliyor</span>
                    <button
                        onClick={onRefresh}
                        className="ml-1 min-h-[42px] px-4 rounded-[12px] bg-[#131210] hover:bg-[#1C1A16] text-[#D9D1C3] hover:text-[#F3EBDD] border border-[#6E6B45]/35 flex items-center gap-2 cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </button>
                </div>
            </div>

            {stockAlerts.length > 0 && (
                <div role="alert" className="px-4 py-3 rounded-[12px] bg-[#7B1E2B]/20 border border-[#9A2A38]/60 text-sm text-[#F3EBDD] space-y-1">
                    <p className="font-semibold">Stoğu biten hammadde var</p>
                    {stockAlerts.map((a) => (
                        <p key={a.name} className="text-[#D9D1C3]">
                            <strong className="text-[#F3EBDD]">{a.name}</strong>
                            {a.products.length > 0 && <> — etkilenen ürünler: {a.products.join(', ')} (Tükendi)</>}
                        </p>
                    ))}
                    <p className="text-xs text-[#B5AEA3]">Stok ekranından Ekle ile stok girin.</p>
                </div>
            )}

            {(error || actionError) && (
                <div className="px-4 py-2.5 rounded-[12px] bg-[#171513] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">
                    {actionError || error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleTables.map((tbl) => (
                    <TableCard key={tbl.id} table={tbl} onSelect={onSelectTable} />
                ))}
            </div>

            {tables.length === 0 && !loading && (
                <div className="py-16 text-center text-sm text-[#B5AEA3]">
                    Henüz masa yok. "QR kodlar" ekranından masa ekleyebilirsiniz.
                </div>
            )}
        </div>
    );

    const pendingArea = (
        <PendingColumn orders={pendingOrders} calls={pendingCalls} onAction={handleAction} busy={busy} />
    );

    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Telefon: Bekleyenler / Masalar arasında geçiş */}
            <div className="md:hidden grid grid-cols-2 gap-1 m-3 mb-0 p-1 bg-[#171513] rounded-[12px] border border-[#6E6B45]/25">
                {[
                    { id: 'pending', label: `Bekleyenler (${pendingTotal})` },
                    { id: 'tables', label: 'Masalar' },
                ].map((v) => (
                    <button
                        key={v.id}
                        onClick={() => setPhoneView(v.id)}
                        className={`min-h-[44px] rounded-[10px] text-sm cursor-pointer ${
                            phoneView === v.id ? 'bg-[#6E6B45] text-[#F3EBDD] font-semibold' : 'text-[#B5AEA3]'
                        }`}
                    >
                        {v.label}
                    </button>
                ))}
            </div>

            <div className={`${phoneView === 'tables' ? 'flex' : 'hidden'} md:flex flex-1 min-h-0`}>{tablesArea}</div>

            {/* Sağ sütun: Bekleyenler */}
            <aside
                className={`${phoneView === 'pending' ? 'block' : 'hidden'} md:block relative md:w-[22rem] md:bg-[#0B0A09]/85 md:border-l border-[#6E6B45]/25 p-4 md:p-5 overflow-y-auto shrink-0 flex-1 md:flex-none min-h-0`}
            >
                {/* Alt köşede bordo-haki akış çizgileri */}
                <div className="hidden md:block absolute bottom-0 inset-x-0 h-48 pointer-events-none overflow-hidden" aria-hidden="true">
                    <div className="absolute -bottom-16 right-0 w-full h-40 bg-[radial-gradient(ellipse_at_bottom,rgba(123,30,43,0.35),transparent_70%)]" />
                    <FlowLines tone="mix" className="absolute bottom-0 left-0 w-full h-full" />
                </div>
                <div className="relative hidden md:flex items-center justify-between pb-4 mb-5 border-b border-[#6E6B45]/25">
                    <h2 className="font-heading text-sm tracking-wider uppercase text-[#F3EBDD]">Bekleyenler</h2>
                    <span className={`min-w-[28px] h-7 px-2 rounded-full text-sm font-semibold flex items-center justify-center tabular-nums ${
                        pendingTotal > 0 ? 'bg-[#7B1E2B] text-[#F3EBDD]' : 'bg-[#2A2823] text-[#D9D1C3]'
                    }`}>{pendingTotal}</span>
                </div>
                {actionError && (
                    <div className="md:hidden mb-3 px-4 py-2.5 rounded-[12px] bg-[#171513] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">
                        {actionError}
                    </div>
                )}
                <div className="relative md:rounded-[16px] md:bg-[#131210]/80 md:border md:border-[#6E6B45]/25 md:p-4">{pendingArea}</div>
            </aside>
        </div>
    );
};
