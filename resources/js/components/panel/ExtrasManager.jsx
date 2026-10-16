import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Languages } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { Flag } from '../common/Flags';
import { formatPrice } from '../../productImage';

const TRANSLATION_LANGS = [
    ['en', 'İngilizce'],
    ['bg', 'Bulgarca'],
    ['el', 'Yunanca'],
];
const emptyNames = (source = {}) => Object.fromEntries(TRANSLATION_LANGS.map(([code]) => [code, { name: source?.[code]?.name ?? '' }]));

const inputCls =
    'w-full h-11 px-3 bg-[#0D0C0B] border border-[#6E6B45]/35 rounded-[12px] text-sm text-[#F3EBDD] placeholder-[#B5AEA3]/50 focus:outline-none focus:border-[#6E6B45]';
const smallBtnCls =
    'min-h-[42px] px-3 rounded-[10px] bg-[#0F0E0D] border border-[#6E6B45]/35 hover:border-[#A6A277]/55 text-sm text-[#D9D1C3] hover:text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50';

// Birim fiyat = küçük boy; orta ×2, büyük ×3 (QR menüde seçilen boya göre gösterilir)
const SizePrices = ({ price }) => {
    const unit = Number(price);
    if (!(unit > 0)) return <span className="text-xs text-[#B5AEA3]/70">Birim fiyat girin</span>;
    return (
        <span className="flex flex-wrap gap-x-2.5 text-xs tabular-nums text-[#B5AEA3]">
            {[['Küçük', 1], ['Orta', 2], ['Büyük', 3]].map(([label, k]) => (
                <span key={label}>
                    <span className="text-[#A6A277]">{label}</span> {formatPrice(unit * k)}
                </span>
            ))}
        </span>
    );
};

const ExtraRow = ({ extra, onSaved, onDeleted }) => {
    const [name, setName] = useState(extra.name);
    const [price, setPrice] = useState(String(Number(extra.price)));
    const [names, setNames] = useState(() => emptyNames(extra.translations));
    const [showTr, setShowTr] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const dirty =
        name.trim() !== extra.name ||
        Number(price) !== Number(extra.price) ||
        JSON.stringify(names) !== JSON.stringify(emptyNames(extra.translations));

    const run = async (fn, fallback) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : errorMessage(err, fallback));
        } finally {
            setBusy(false);
        }
    };

    const save = () =>
        run(async () => onSaved(await apiService.updateExtra(extra.id, { name: name.trim(), price: Number(price), translations: names })), 'İlave kaydedilemedi.');

    const toggleActive = () =>
        run(async () => onSaved(await apiService.updateExtra(extra.id, { is_active: !extra.is_active })), 'Durum değiştirilemedi.');

    const remove = () => {
        if (!confirm(`"${extra.name}" ilavesi silinsin mi?`)) return;
        run(async () => {
            await apiService.deleteExtra(extra.id);
            onDeleted(extra.id);
        }, 'İlave silinemedi.');
    };

    return (
        <div className={`rounded-[14px] px-4 py-3 bg-gradient-to-r from-[#1A1815] to-[#121110] border border-[#6E6B45]/25 space-y-2.5 ${extra.is_active ? '' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-center gap-2">
                <input
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="İlave adı"
                    className={`${inputCls} flex-1 min-w-[160px]`}
                />
                <div className="relative w-28 shrink-0">
                    <input
                        type="number" min="0" step="1" inputMode="numeric"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        aria-label="Birim fiyat (küçük boy)"
                        className={`${inputCls} tabular-nums pr-8`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#B5AEA3]">₺</span>
                </div>
                <button type="button" onClick={save} disabled={busy || !dirty || !name.trim() || !(Number(price) > 0)} className={`${smallBtnCls} text-[#F3EBDD]`}>
                    <Check className="w-4 h-4" />
                    Kaydet
                </button>
                <button
                    type="button"
                    onClick={toggleActive}
                    disabled={busy}
                    title={extra.is_active ? 'Pasif ilave QR menüde görünmez' : 'QR menüde tekrar göster'}
                    className={`${smallBtnCls} min-w-[96px]`}
                >
                    <span className={`w-2 h-2 rounded-full ${extra.is_active ? 'bg-[#8FA35A]' : 'bg-[#B5AEA3]/60'}`} />
                    {extra.is_active ? 'Aktif' : 'Pasif'}
                </button>
                <button type="button" onClick={() => setShowTr((v) => !v)} aria-pressed={showTr} className={smallBtnCls}>
                    <Languages className="w-4 h-4" />
                    Çeviri
                </button>
                <button type="button" onClick={remove} disabled={busy} className={smallBtnCls}>
                    <Trash2 className="w-4 h-4" />
                    Sil
                </button>
            </div>

            <SizePrices price={price} />

            {showTr && (
                <div className="rounded-[12px] border border-[#6E6B45]/30 bg-[#0D0C0B]/60 p-3 flex flex-wrap gap-2">
                    {TRANSLATION_LANGS.map(([code, label]) => (
                        <label key={code} className="flex-1 min-w-[150px]">
                            <span className="flex items-center gap-1.5 text-xs text-[#B5AEA3] mb-1">
                                <Flag lang={code} className="w-5 h-[13px]" />
                                {label}
                            </span>
                            <input
                                maxLength={60}
                                value={names[code].name}
                                placeholder={name}
                                onChange={(e) => setNames((n) => ({ ...n, [code]: { name: e.target.value } }))}
                                className={inputCls}
                            />
                        </label>
                    ))}
                    <p className="w-full text-xs text-[#B5AEA3]/80">Çeviriyi girdikten sonra Kaydet'e basın. Boş bırakılan dilde Türkçe ad gösterilir.</p>
                </div>
            )}

            {error && <div className="text-sm text-[#E07A88]">{error}</div>}
        </div>
    );
};

// Menü ekranındaki "İlaveler" bölümü: ek malzemeler ve birim fiyatları
export const ExtrasManager = ({ onChanged }) => {
    const [extras, setExtras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        apiService
            .getPanelExtras()
            .then(setExtras)
            .catch((err) => setError(errorMessage(err, 'İlaveler yüklenemedi.')))
            .finally(() => setLoading(false));
    }, []);

    const add = async (e) => {
        e.preventDefault();
        if (!newName.trim() || !(Number(newPrice) > 0)) return;
        setAdding(true);
        setError(null);
        try {
            const created = await apiService.createExtra({ name: newName.trim(), price: Number(newPrice) });
            setExtras((prev) => [...prev, created]);
            setNewName('');
            setNewPrice('');
            onChanged?.();
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : errorMessage(err, 'İlave eklenemedi.'));
        } finally {
            setAdding(false);
        }
    };

    return (
        <section className="relative space-y-2.5 pt-2">
            <div className="flex flex-wrap items-center gap-3">
                <h3 className="flex items-center gap-3 text-base font-semibold text-[#F3EBDD]">
                    <span className="w-2 h-2 rounded-full shrink-0 bg-[#E8A15A]" />
                    İlaveler
                    <span className="text-xs font-normal text-[#B5AEA3] tabular-nums">{extras.length} malzeme</span>
                </h3>
                <span className="h-px flex-1 min-w-8 bg-gradient-to-r from-[#6E6B45]/40 to-transparent" />
            </div>
            <p className="text-xs text-[#B5AEA3]">
                Birim fiyat <strong className="text-[#F3EBDD]">küçük boy</strong> fiyatıdır; QR menüde orta boyda ×2, büyük boyda ×3 gösterilir.
                İlavelerin hangi üründe görüneceğini ürünü <strong className="text-[#F3EBDD]">Düzenle</strong> ile açıp "İlaveler gösterilsin" kutusundan seçin.
            </p>

            {error && <div className="px-3 py-2 rounded-[10px] bg-[#171513] border border-[#9A2A38]/50 text-sm text-[#F3EBDD]">{error}</div>}

            {loading ? (
                <div className="text-sm text-[#B5AEA3] py-3">Yükleniyor...</div>
            ) : (
                extras.map((ex) => (
                    <ExtraRow
                        key={ex.id}
                        extra={ex}
                        onSaved={(updated) => {
                            setExtras((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                            onChanged?.();
                        }}
                        onDeleted={(id) => {
                            setExtras((prev) => prev.filter((x) => x.id !== id));
                            onChanged?.();
                        }}
                    />
                ))
            )}

            {/* Yeni ilave */}
            <form onSubmit={add} className="rounded-[14px] px-4 py-3 border border-dashed border-[#6E6B45]/40 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        value={newName}
                        maxLength={60}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Yeni ilave (örn: Ekstra Mozzarella)"
                        className={`${inputCls} flex-1 min-w-[160px]`}
                    />
                    <div className="relative w-28 shrink-0">
                        <input
                            type="number" min="0" step="1" inputMode="numeric"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="Birim"
                            aria-label="Birim fiyat (küçük boy)"
                            className={`${inputCls} tabular-nums pr-8`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#B5AEA3]">₺</span>
                    </div>
                    <button
                        type="submit"
                        disabled={adding || !newName.trim() || !(Number(newPrice) > 0)}
                        className="min-h-[44px] px-4 rounded-[10px] bg-[#7B1E2B] hover:bg-[#9A2A38] text-sm font-semibold text-[#F3EBDD] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        İlave ekle
                    </button>
                </div>
                {newPrice !== '' && <SizePrices price={newPrice} />}
            </form>
        </section>
    );
};
