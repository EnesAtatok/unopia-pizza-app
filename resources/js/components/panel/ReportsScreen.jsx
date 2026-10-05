import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, HandCoins, ReceiptText, Banknote, CreditCard, ArrowRightLeft, PackagePlus } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { formatPrice } from '../../productImage';
import { FlowLines } from '../common/Icons';

const toISODate = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Dönem: gün / hafta (Pzt–Paz) / ay. unit: gezinme butonlarındaki ad ("Önceki gün")
const PERIODS = [
    { id: 'day', label: 'Gün', unit: 'gün' },
    { id: 'week', label: 'Hafta', unit: 'hafta' },
    { id: 'month', label: 'Ay', unit: 'ay' },
];

const shiftDate = (iso, period, step) => {
    const d = new Date(`${iso}T12:00:00`);
    if (period === 'month') d.setMonth(d.getMonth() + step, 1);
    else d.setDate(d.getDate() + step * (period === 'week' ? 7 : 1));
    return toISODate(d);
};

const periodStart = (iso, period) => {
    const d = new Date(`${iso}T12:00:00`);
    if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    if (period === 'month') d.setDate(1);
    return toISODate(d);
};

const fmt = (iso, opts) => new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR', opts);
const periodLabel = (date, period, report) => {
    if (period === 'month') return fmt(date, { month: 'long', year: 'numeric' });
    if (period === 'week' && report?.from) return `${fmt(report.from, { day: 'numeric', month: 'long' })} – ${fmt(report.to, { day: 'numeric', month: 'long', year: 'numeric' })}`;
    return fmt(date, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
};

// Altın-haki degrade kart, sağda ikon kutusu (görseldeki gibi)
const Kpi = ({ label, value, sub, icon: Icon }) => (
    <div className="relative overflow-hidden rounded-[14px] border border-[#A6A277]/35 bg-gradient-to-br from-[#4A4630] via-[#2A271D] to-[#151311] shadow-[inset_0_1px_0_rgba(243,235,221,0.08)] p-4 pr-3 flex items-stretch gap-3 min-h-[112px]">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(166,162,119,0.22),transparent_70%)] pointer-events-none" aria-hidden="true" />
        <div className="relative flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-sm text-[#E6DECF]">{label}</div>
            <div className="text-[26px] leading-tight font-semibold text-[#F3EBDD] tabular-nums mt-1">{value}</div>
            {sub && <div className="text-xs text-[#D9D1C3] mt-1">{sub}</div>}
        </div>
        <div className="relative w-[64px] shrink-0 rounded-[12px] bg-[#0F0E0D]/70 border border-[#A6A277]/25 flex items-center justify-center">
            <Icon className="w-8 h-8 text-[#C9C29A]" strokeWidth={1.4} />
        </div>
    </div>
);

const sectionCls = 'bg-gradient-to-b from-[#1A1815] to-[#121110] border border-[#6E6B45]/30 rounded-[14px] overflow-hidden';
const sectionHeadCls = 'px-4 py-3.5 border-b border-[#6E6B45]/25 text-base font-semibold text-[#F3EBDD]';
const navBtnCls =
    'min-h-[40px] px-3 rounded-[10px] text-sm text-[#B5AEA3] hover:text-[#F3EBDD] hover:bg-[#1E1C18] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40 disabled:hover:bg-transparent';

export const ReportsScreen = () => {
    const today = toISODate(new Date());
    const [date, setDate] = useState(today);
    const [period, setPeriod] = useState('day');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setReport(await apiService.getDailyReport(date, period));
        } catch (err) {
            setError(errorMessage(err, 'Rapor alınamadı.'));
        } finally {
            setLoading(false);
        }
    }, [date, period]);

    useEffect(() => {
        load();
    }, [load]);

    const sales = report?.product_sales || [];
    const maxRevenue = Math.max(1, ...sales.map((s) => s.revenue));
    const dateLabel = periodLabel(date, period, report);
    const unit = PERIODS.find((p) => p.id === period).unit;
    // Sonraki dönem bugünden sonra başlıyorsa ileri gidilemez
    const nextDisabled = periodStart(shiftDate(date, period, 1), period) > today;

    return (
        <div className="relative flex-1 p-4 md:p-6 overflow-y-auto space-y-5 min-h-0">
            {/* Üst kenarda bordo-haki akış çizgileri */}
            <FlowLines tone="mix" className="absolute top-0 right-0 w-2/3 h-28 opacity-80 pointer-events-none" />

            <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-semibold tracking-wide uppercase text-[#F3EBDD]">Raporlar</h2>
                    <p className="text-sm text-[#D9D1C3] mt-0.5">{dateLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Dönem: gün / hafta / ay */}
                    <div className="flex gap-1 p-1 bg-[#131210]/90 rounded-[12px] border border-[#6E6B45]/35">
                        {PERIODS.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={`min-h-[40px] px-4 rounded-[10px] text-sm cursor-pointer transition-colors ${
                                    period === p.id
                                        ? 'bg-gradient-to-b from-[#7A7650] to-[#5E5B3A] text-[#F3EBDD] font-semibold shadow-[inset_0_1px_0_rgba(243,235,221,0.15)]'
                                        : 'text-[#B5AEA3] hover:text-[#F3EBDD]'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {/* Tarih gezinme: tek kutuda önceki · tarih · sonraki */}
                    <div className="flex items-center gap-1 p-1 bg-[#131210]/90 rounded-[12px] border border-[#6E6B45]/35">
                        <button onClick={() => setDate(shiftDate(date, period, -1))} className={navBtnCls}>
                            <ChevronLeft className="w-4 h-4" />
                            Önceki {unit}
                        </button>
                        <input
                            type="date"
                            value={date}
                            max={today}
                            onChange={(e) => e.target.value && setDate(e.target.value)}
                            className="min-h-[40px] px-3 rounded-[10px] bg-gradient-to-b from-[#7A7650] to-[#5E5B3A] text-sm font-semibold text-[#F3EBDD] tabular-nums shadow-[inset_0_1px_0_rgba(243,235,221,0.15)] [color-scheme:dark] cursor-pointer focus:outline-none"
                        />
                        <button
                            onClick={() => setDate(shiftDate(date, period, 1) > today ? today : shiftDate(date, period, 1))}
                            disabled={nextDisabled}
                            className={navBtnCls}
                        >
                            Sonraki {unit}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={load}
                        className="min-h-[46px] px-5 rounded-[12px] bg-[#131210]/90 border border-[#6E6B45]/35 text-sm text-[#D9D1C3] hover:text-[#F3EBDD] hover:border-[#A6A277]/50 flex items-center gap-2 cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </button>
                </div>
            </div>

            {error ? (
                <div className="relative px-4 py-3 rounded-[12px] bg-[#171513] border border-[#9A2A38]/50 text-sm text-[#F3EBDD]">{error}</div>
            ) : !report ? (
                loading && <p className="text-sm text-[#B5AEA3] py-10 text-center">Rapor yükleniyor…</p>
            ) : (
                <>
                    {/* Günlük ciro: yalnızca hesabı kapatılan (ödemesi alınan) adisyonlar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <Kpi icon={HandCoins} label={`${{ day: 'Günlük', week: 'Haftalık', month: 'Aylık' }[period]} ciro`} value={formatPrice(report.revenue)} sub={`${report.closed_orders} adisyon kapatıldı`} />
                        <Kpi icon={ReceiptText} label="Ortalama adisyon" value={formatPrice(report.average_basket)} />
                        <Kpi icon={Banknote} label="Nakit" value={formatPrice(report.cash_revenue)} />
                        <Kpi icon={CreditCard} label="Kredi kartı" value={formatPrice(report.card_revenue)} />
                    </div>

                    {/* Bilgi şeridi: açık masalar · reddedilen siparişler */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 px-4 py-2.5 rounded-[12px] border border-[#A6A277]/30 bg-gradient-to-r from-[#2A271D] via-[#1A1815] to-[#131210] text-sm text-[#D9D1C3]">
                        {report.open_amount !== null && (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#C23A4B] shadow-[0_0_8px_rgba(194,58,75,0.8)]" aria-hidden="true" />
                                <span>
                                    Açık masalarda (henüz ödenmedi): <strong className="text-[#F3EBDD] tabular-nums">{formatPrice(report.open_amount)}</strong>
                                </span>
                            </span>
                        )}
                        <span className="flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4 text-[#C23A4B]" aria-hidden="true" />
                            <span>
                                Reddedilen sipariş: <strong className="text-[#F3EBDD] tabular-nums">{report.rejected_orders}</strong>
                            </span>
                        </span>
                        <span className="flex items-center gap-2">
                            <PackagePlus className="w-4 h-4 text-[#A6A277]" aria-hidden="true" />
                            <span>
                                Stok alışları: <strong className="text-[#F3EBDD] tabular-nums">{formatPrice(report.purchase_total)}</strong>
                            </span>
                        </span>
                    </div>

                    {/* Ürün bazlı satış */}
                    <section className={sectionCls}>
                        <h3 className={sectionHeadCls}>Ürün bazlı satış</h3>
                        {sales.length === 0 ? (
                            <p className="text-sm text-[#B5AEA3] py-14 text-center">{period === 'day' ? 'Bu gün kapatılan adisyon yok.' : `Bu ${unit} kapatılan adisyon yok.`}</p>
                        ) : (
                            <div className="px-4 pb-2">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-[#A6A277] border-b border-[#6E6B45]/25">
                                            <th className="py-2.5 font-medium">Ürün</th>
                                            <th className="py-2.5 font-medium text-right w-20">Adet</th>
                                            <th className="py-2.5 font-medium text-right w-28">Tutar</th>
                                            <th className="py-2.5 pl-6 font-medium w-1/4 hidden sm:table-cell">Pay</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.map((s) => (
                                            <tr key={s.name} className="border-b border-[#6E6B45]/15 last:border-0">
                                                <td className="py-3 text-[#F3EBDD] font-medium tracking-wide">{s.name}</td>
                                                <td className="py-3 text-right text-[#F3EBDD] tabular-nums">{s.quantity}</td>
                                                <td className="py-3 text-right text-[#F3EBDD] font-semibold tabular-nums">{formatPrice(s.revenue)}</td>
                                                <td className="py-3 pl-6 hidden sm:table-cell">
                                                    <div className="h-2 rounded-full bg-[#0D0C0B] border border-[#6E6B45]/20 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-[#7B1E2B] to-[#A6A277]"
                                                            style={{ width: `${(s.revenue / maxRevenue) * 100}%` }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Stok alışları: Stok → Ekle'de toplam tutar girilenler */}
                    <section className={sectionCls}>
                        <h3 className={`${sectionHeadCls} flex items-center justify-between gap-3`}>
                            Stok alışları
                            <span className="tabular-nums">{formatPrice(report.purchase_total)}</span>
                        </h3>
                        {report.purchases.length === 0 ? (
                            <p className="text-sm text-[#B5AEA3] px-4 py-4">{period === 'day' ? 'Bu gün' : `Bu ${unit}`} tutarı girilen alış yok.</p>
                        ) : (
                            <div className="px-4 pb-2 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-[#A6A277] border-b border-[#6E6B45]/25">
                                            <th className="py-2.5 font-medium w-28">Tarih</th>
                                            <th className="py-2.5 font-medium">Hammadde</th>
                                            <th className="py-2.5 font-medium text-right w-24">Miktar</th>
                                            <th className="py-2.5 font-medium text-right w-28">Tutar</th>
                                            <th className="py-2.5 pl-6 font-medium hidden sm:table-cell">Açıklama</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.purchases.map((p) => (
                                            <tr key={p.id} className="border-b border-[#6E6B45]/15 last:border-0">
                                                <td className="py-3 text-[#B5AEA3] tabular-nums">
                                                    {new Date(p.date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3 text-[#F3EBDD]">{p.name}</td>
                                                <td className="py-3 text-right text-[#F3EBDD] tabular-nums">{p.quantity.toLocaleString('tr-TR')} {p.base_unit}</td>
                                                <td className="py-3 text-right text-[#F3EBDD] font-semibold tabular-nums">{formatPrice(p.total_cost)}</td>
                                                <td className="py-3 pl-6 text-[#B5AEA3] hidden sm:table-cell truncate max-w-[16rem]">{p.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Kritik stok */}
                    <section className={sectionCls}>
                        <h3 className={sectionHeadCls}>Kritik seviyedeki hammaddeler</h3>
                        {report.critical_stocks.length === 0 ? (
                            <p className="text-sm text-[#B5AEA3] px-4 py-4">Kritik seviyenin altında hammadde yok.</p>
                        ) : (
                            <ul className="divide-y divide-[#6E6B45]/15 px-4">
                                {report.critical_stocks.map((m) => {
                                    const ratio = Number(m.critical_level) > 0 ? Math.min(1, Number(m.current_stock) / Number(m.critical_level)) : 0;
                                    return (
                                        <li key={m.id} className="py-3 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-[#F3EBDD]">{m.name}</span>
                                                <span className="text-[#B5AEA3] tabular-nums">
                                                    <strong className="text-[#F3EBDD]">{Number(m.current_stock).toLocaleString('tr-TR')} {m.base_unit}</strong>
                                                    {' '}/ kritik {Number(m.critical_level).toLocaleString('tr-TR')} {m.base_unit}
                                                </span>
                                            </div>
                                            {/* Kritik seviyeye göre doluluk */}
                                            <div className="mt-2 ml-auto w-full sm:w-[220px] h-1.5 rounded-full bg-[#0D0C0B] border border-[#6E6B45]/20 overflow-hidden" aria-hidden="true">
                                                <div className="h-full rounded-full bg-gradient-to-r from-[#9A2A38] to-[#C23A4B]" style={{ width: `${ratio * 100}%` }} />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};
