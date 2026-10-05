import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Trash2, PackagePlus, Flame, History, Package } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { FlowLines } from '../common/Icons';
import { formatPrice } from '../../productImage';

const UNIT_LABELS = { g: 'gram', ml: 'ml', adet: 'adet' };
const MOVE_LABELS = { purchase: 'Alış', sale: 'Satış', waste: 'Fire', adjustment: 'Sayım farkı', production: 'Üretim' };

/** Gramaj bazlı miktarı okunur göster: 12500 g → 12,5 kg */
const formatQty = (value, unit) => {
    const n = Number(value) || 0;
    if (unit === 'g' && Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} kg`;
    if (unit === 'ml' && Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} L`;
    return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ${unit}`;
};

const inputCls =
    'h-11 px-3 bg-[#0D0C0B] border border-[#6E6B45]/35 rounded-[10px] text-sm text-[#F3EBDD] placeholder-[#B5AEA3]/50 focus:outline-none focus:border-[#A6A277]/70';
const btnCls =
    'min-h-[40px] px-3.5 rounded-[10px] bg-[#0F0E0D] border border-[#6E6B45]/35 hover:border-[#A6A277]/55 text-sm text-[#F3EBDD] flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50';
const primaryCls =
    'min-h-[42px] px-5 rounded-[10px] bg-gradient-to-r from-[#7B1E2B] to-[#5A1520] hover:from-[#9A2A38] hover:to-[#7B1E2B] ring-1 ring-[#9A2A38]/50 shadow-[0_8px_24px_rgba(123,30,43,0.3)] text-sm font-semibold text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50';
const cardCls = 'bg-gradient-to-r from-[#1A1815] to-[#121110] border border-[#6E6B45]/25 rounded-[14px]';

// Satır altında açılan işlem formu: alış (Ekle) / fire
const ActionForm = ({ material, action, onDone, onCancel }) => {
    const [qty, setQty] = useState('');
    const [cost, setCost] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const unit = material.base_unit;

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const updated = action === 'purchase'
                ? await apiService.purchaseStock(material.id, { quantity: qty, total_cost: cost || null, description: note || null })
                : await apiService.wasteStock(material.id, { quantity: qty, description: note || null });
            onDone(updated);
        } catch (err) {
            setError(errorMessage(err, 'Kaydedilemedi.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="mt-3 pt-3 border-t border-[#6E6B45]/20 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
                <span className="text-xs text-[#B5AEA3]">Miktar ({UNIT_LABELS[unit]})</span>
                <input required autoFocus type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputCls} w-40 tabular-nums`} />
            </label>
            {action === 'purchase' && (
                <label className="flex flex-col gap-1">
                    <span className="text-xs text-[#B5AEA3]">Toplam tutar (₺, opsiyonel)</span>
                    <input type="number" min="0" step="any" value={cost} onChange={(e) => setCost(e.target.value)} className={`${inputCls} w-40 tabular-nums`} />
                </label>
            )}
            <label className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <span className="text-xs text-[#B5AEA3]">{action === 'purchase' ? 'Açıklama (ör. fatura no)' : 'Sebep'}</span>
                <input value={note} maxLength={150} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </label>
            <button type="submit" disabled={busy} className={primaryCls}>Kaydet</button>
            <button type="button" onClick={onCancel} className={btnCls}>Vazgeç</button>
            {error && <div className="w-full text-sm text-[#F3EBDD]">{error}</div>}
        </form>
    );
};

const MaterialsTab = ({ materials, setMaterials }) => {
    const [open, setOpen] = useState(null); // { id, action }
    const [history, setHistory] = useState(null); // { id, rows }
    const [newMat, setNewMat] = useState({ name: '', base_unit: 'g', critical_level: '' });
    const [error, setError] = useState(null);

    const replace = (m) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? m : x)));

    const showHistory = async (m) => {
        if (history?.id === m.id) return setHistory(null);
        try {
            setHistory({ id: m.id, rows: await apiService.getStockMovements(m.id) });
        } catch (err) {
            setError(errorMessage(err, 'Geçmiş alınamadı.'));
        }
    };

    const addMaterial = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const created = await apiService.createRawMaterial({ ...newMat, critical_level: newMat.critical_level || 0 });
            setMaterials((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
            setNewMat({ name: '', base_unit: 'g', critical_level: '' });
        } catch (err) {
            setError(errorMessage(err, 'Hammadde eklenemedi.'));
        }
    };

    return (
        <div className="space-y-2.5">
            <form onSubmit={addMaterial} className="bg-[#131210]/80 border border-dashed border-[#6E6B45]/40 rounded-[14px] p-3.5 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
                    <span className="text-xs text-[#B5AEA3]">Yeni hammadde</span>
                    <input required maxLength={80} value={newMat.name} onChange={(e) => setNewMat({ ...newMat, name: e.target.value })} placeholder="Örn: Fesleğen" className={inputCls} />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs text-[#B5AEA3]">Birim</span>
                    <select value={newMat.base_unit} onChange={(e) => setNewMat({ ...newMat, base_unit: e.target.value })} className={`${inputCls} w-28`}>
                        <option value="g">gram</option>
                        <option value="ml">ml</option>
                        <option value="adet">adet</option>
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs text-[#B5AEA3]">Kritik seviye</span>
                    <input type="number" min="0" step="any" value={newMat.critical_level} onChange={(e) => setNewMat({ ...newMat, critical_level: e.target.value })} className={`${inputCls} w-32 tabular-nums`} />
                </label>
                <button type="submit" className={primaryCls}>
                    <Plus className="w-4 h-4" />
                    Ekle
                </button>
            </form>

            {error && <div className="px-4 py-2.5 rounded-[12px] bg-[#171513] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">{error}</div>}

            {materials.map((m) => {
                const alert = m.is_out || m.is_critical;
                return (
                <div
                    key={m.id}
                    className={`group relative overflow-hidden ${cardCls} pl-5 pr-3 py-2.5 hover:border-[#A6A277]/40 transition-colors ${
                        alert ? 'border-[#9A2A38]/45' : ''
                    }`}
                >
                    {/* Sol şerit: normalde koyu bordo, kritikte / bitince parlak bordo */}
                    <span
                        className={`absolute left-0 top-0 bottom-0 w-[5px] ${
                            alert ? 'bg-[#C23A4B] shadow-[0_0_14px_rgba(194,58,75,0.7)]' : 'bg-[#7B1E2B]'
                        }`}
                        aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[160px] pl-1">
                            <div className="text-[14px] font-semibold tracking-wide text-[#F3EBDD]">{m.name}</div>
                            <div className="text-xs text-[#B5AEA3] tabular-nums mt-0.5">
                                Kritik: {m.critical_level > 0 ? formatQty(m.critical_level, m.base_unit) : '—'}
                                {m.average_cost > 0 && ` · Ort. maliyet ₺${(m.average_cost * (m.base_unit === 'adet' ? 1 : 1000)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}/${m.base_unit === 'g' ? 'kg' : m.base_unit === 'ml' ? 'L' : 'adet'}`}
                            </div>
                        </div>

                        {/* Miktar kutusu */}
                        <div
                            className={`min-w-[104px] px-4 py-1.5 rounded-[10px] border flex flex-col items-center justify-center gap-1 ${
                                alert ? 'bg-[#1A0F10] border-[#9A2A38]/60' : 'bg-[#0D0C0B] border-[#6E6B45]/30'
                            }`}
                        >
                            <div className="text-[15px] font-semibold text-[#F3EBDD] tabular-nums leading-tight">{formatQty(m.current_stock, m.base_unit)}</div>
                            {m.is_out ? (
                                <div className="text-[11px] font-semibold text-[#F3EBDD] px-2 py-0.5 rounded-[6px] bg-[#C23A4B]">Stok bitti</div>
                            ) : m.is_critical && (
                                <div className="text-[11px] font-semibold text-[#F3EBDD] px-2 py-0.5 rounded-[6px] bg-[#7B1E2B]">Kritik seviyede</div>
                            )}
                        </div>

                        <span className="hidden sm:block w-px h-9 bg-[#6E6B45]/25" aria-hidden="true" />

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <button onClick={() => setOpen({ id: m.id, action: 'purchase' })} className={btnCls}>
                                <PackagePlus className="w-4 h-4 text-[#A6A277]" />
                                Ekle
                            </button>
                            <button onClick={() => setOpen({ id: m.id, action: 'waste' })} className={btnCls}>
                                <Flame className="w-4 h-4 text-[#A6A277]" />
                                Fire
                            </button>
                            <button onClick={() => showHistory(m)} className={btnCls}>
                                <History className="w-4 h-4 text-[#A6A277]" />
                                Geçmiş
                            </button>
                        </div>
                    </div>

                    {open?.id === m.id && (
                        <ActionForm
                            material={m}
                            action={open.action}
                            onCancel={() => setOpen(null)}
                            onDone={(updated) => {
                                replace(updated);
                                setOpen(null);
                                if (history?.id === m.id) setHistory(null);
                            }}
                        />
                    )}

                    {history?.id === m.id && (
                        <div className="mt-3 pt-3 border-t border-[#6E6B45]/20">
                            {history.rows.length === 0 ? (
                                <p className="text-sm text-[#B5AEA3]">Hareket yok.</p>
                            ) : (
                                <ul className="text-sm divide-y divide-[#F3EBDD]/5 max-h-60 overflow-y-auto">
                                    {history.rows.map((row) => (
                                        <li key={row.id} className="py-2 flex items-center justify-between gap-3">
                                            <span className="text-[#B5AEA3] w-28 shrink-0 tabular-nums">
                                                {new Date(row.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-[#F3EBDD] w-24 shrink-0">{MOVE_LABELS[row.type] || row.type}</span>
                                            <span className="text-[#B5AEA3] flex-1 truncate">{row.description}{row.user ? ` · ${row.user.name}` : ''}</span>
                                            <span className="text-[#F3EBDD] tabular-nums shrink-0">
                                                {Number(row.quantity) > 0 ? '+' : ''}{formatQty(row.quantity, m.base_unit)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
                );
            })}
        </div>
    );
};

const RecipesTab = ({ materials }) => {
    const [products, setProducts] = useState([]);
    const [productId, setProductId] = useState(null);
    const [rows, setRows] = useState([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        apiService.getPanelProducts().then((list) => {
            setProducts(list);
            if (list[0]) setProductId(list[0].id);
        }).catch((err) => setMessage(errorMessage(err, 'Ürünler alınamadı.')));
    }, []);

    useEffect(() => {
        if (!productId) return;
        setMessage(null);
        apiService.getRecipe(productId)
            .then((items) => setRows(items.map((i) => ({ raw_material_id: i.raw_material_id, quantity: i.quantity }))))
            .catch((err) => setMessage(errorMessage(err, 'Reçete alınamadı.')));
    }, [productId]);

    const product = products.find((p) => p.id === productId);
    const materialById = Object.fromEntries(materials.map((m) => [m.id, m]));
    const cost = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (materialById[r.raw_material_id]?.average_cost || 0), 0);

    const save = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const items = rows.filter((r) => r.raw_material_id && Number(r.quantity) > 0);
            const saved = await apiService.saveRecipe(productId, items);
            setRows(saved.map((i) => ({ raw_material_id: i.raw_material_id, quantity: i.quantity })));
            setMessage('Reçete kaydedildi. Bu ürün satıldıkça stoktan düşülür.');
        } catch (err) {
            const errors = err.response?.data?.errors;
            setMessage(errors ? Object.values(errors).flat().join(' ') : errorMessage(err, 'Kaydedilemedi.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid md:grid-cols-[240px_1fr] gap-4">
            <div className={`${cardCls} p-2 max-h-[60vh] overflow-y-auto space-y-1`}>
                {products.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setProductId(p.id)}
                        className={`relative overflow-hidden w-full text-left min-h-[44px] pl-4 pr-3 rounded-[10px] text-sm tracking-wide cursor-pointer transition-colors ${
                            p.id === productId
                                ? 'bg-[#26231F] text-[#F3EBDD] font-semibold ring-1 ring-[#A6A277]/30'
                                : 'text-[#B5AEA3] hover:text-[#F3EBDD] hover:bg-[#171513]'
                        }`}
                    >
                        {p.id === productId && <span className="absolute left-0 top-2 bottom-2 w-[4px] rounded-r bg-[#9A2A38]" aria-hidden="true" />}
                        {p.name}
                    </button>
                ))}
            </div>

            {product && (
                <div className={`relative overflow-hidden ${cardCls} pl-6 pr-4 py-4 space-y-3`}>
                    <span className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#7B1E2B]" aria-hidden="true" />
                    <div>
                        <h3 className="text-base font-semibold text-[#F3EBDD]">{product.name} reçetesi</h3>
                        <p className="text-sm text-[#B5AEA3]">1 adet (orta boy) için kullanılan hammadde miktarları</p>
                    </div>

                    {rows.length === 0 && <p className="text-sm text-[#B5AEA3]">Reçete yok — bu ürün satıldığında stoktan bir şey düşülmez.</p>}

                    {rows.map((row, i) => {
                        const mat = materialById[row.raw_material_id];
                        return (
                            <div key={i} className="flex items-center gap-2">
                                <select
                                    value={row.raw_material_id || ''}
                                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, raw_material_id: Number(e.target.value) } : r)))}
                                    className={`${inputCls} flex-1 min-w-0`}
                                >
                                    <option value="" disabled>Hammadde seçin</option>
                                    {materials.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="number" min="0" step="any"
                                    value={row.quantity}
                                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))}
                                    className={`${inputCls} w-28 tabular-nums`}
                                />
                                <span className="text-sm text-[#B5AEA3] w-10">{mat?.base_unit || ''}</span>
                                <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className={btnCls}>
                                    <Trash2 className="w-4 h-4" />
                                    Sil
                                </button>
                            </div>
                        );
                    })}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button onClick={() => setRows([...rows, { raw_material_id: '', quantity: '' }])} className={btnCls}>
                            <Plus className="w-4 h-4" />
                            Hammadde ekle
                        </button>
                        <button onClick={save} disabled={busy} className={primaryCls}>Reçeteyi kaydet</button>
                    </div>

                    <div className="pt-3 border-t border-[#6E6B45]/20 text-sm text-[#B5AEA3]">
                        Tahmini hammadde maliyeti: <strong className="text-[#F3EBDD] tabular-nums">{formatPrice(cost)}</strong>
                        {' '}· Satış fiyatı: <strong className="text-[#F3EBDD] tabular-nums">{formatPrice(product.sizes?.medium ?? product.price)}</strong>
                        {cost === 0 && rows.length > 0 && ' (maliyet için alışlarda tutar girin)'}
                    </div>
                    {message && <p className="text-sm text-[#F3EBDD]">{message}</p>}
                </div>
            )}
        </div>
    );
};

// Yalnızca yönetici açar (garson stok ekranını görmez)
export const StockScreen = () => {
    const [tab, setTab] = useState('materials');
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setMaterials(await apiService.getStock());
            setError(null);
        } catch (err) {
            setError(errorMessage(err, 'Stok yüklenemedi.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const criticalCount = materials.filter((m) => m.is_critical).length;

    return (
        <div className="relative flex-1 p-4 md:p-6 overflow-y-auto space-y-5 min-h-0">
            {/* Üst kenarda bordo-haki akış çizgileri */}
            <FlowLines tone="mix" className="absolute top-0 right-0 w-2/3 h-28 opacity-80 pointer-events-none" />

            <div className="relative flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#6E6B45]/20">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-[#26231F] to-[#131210] border border-[#6E6B45]/40 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-[#A6A277]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-wide uppercase text-[#F3EBDD]">Stok ve reçete</h2>
                        <p className="text-sm text-[#D9D1C3] mt-0.5">
                            Gramaj bazlı hammadde · {criticalCount > 0 ? `${criticalCount} hammadde kritik seviyede` : 'kritik seviyede hammadde yok'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1 p-1 bg-[#131210]/90 rounded-[12px] border border-[#6E6B45]/35">
                        {[['materials', 'Hammaddeler'], ['recipes', 'Reçeteler']].map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                className={`min-h-[40px] px-5 rounded-[10px] text-sm cursor-pointer transition-colors ${
                                    tab === id
                                        ? 'bg-gradient-to-b from-[#7A7650] to-[#5E5B3A] text-[#F3EBDD] font-semibold shadow-[inset_0_1px_0_rgba(243,235,221,0.15)]'
                                        : 'text-[#B5AEA3] hover:text-[#F3EBDD]'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
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

            {error && <div className="px-4 py-2.5 rounded-[12px] bg-[#171513] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">{error}</div>}

            {tab === 'materials' ? (
                <MaterialsTab materials={materials} setMaterials={setMaterials} />
            ) : (
                <RecipesTab materials={materials} />
            )}
        </div>
    );
};
