import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Upload, RefreshCw, EyeOff, Eye, Languages, Trash2, Check, ChefHat, Percent } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { FlowLines } from '../common/Icons';
import { Flag } from '../common/Flags';
import { ExtrasManager } from './ExtrasManager';
import { getProductImage, formatPrice, getDefaultSize, priceForSize, productDisplayName, isPiecePricing, trPieceLabel } from '../../productImage';

const ALLERGENS = ['Gluten', 'Süt', 'Yumurta', 'Fındık', 'Ceviz', 'Susam', 'Soya'];

// QR menü çeviri dilleri (Türkçe asıl alanlardır; boş bırakılan çeviri müşteriye Türkçe gösterilir)
const TRANSLATION_LANGS = [
    ['en', 'İngilizce'],
    ['bg', 'Bulgarca'],
    ['el', 'Yunanca'],
];
const emptyTranslations = (fields, source = {}) =>
    Object.fromEntries(TRANSLATION_LANGS.map(([code]) => [code, Object.fromEntries(fields.map((f) => [f, source?.[code]?.[f] ?? '']))]));
// Kısa açıklama sunucuda malzemelerden doldurulur (formda ayrı alanı yok)
const PRODUCT_TR_FIELDS = ['name', 'ingredients', 'chef_note'];

const emptyForm = (categoryId) => ({
    id: null,
    name: '',
    category_id: categoryId || '',
    ingredients: '',
    chef_note: '',
    price: '',
    sizes: { small: '', medium: '', large: '' },
    pricing: 'size', // 'size' (Küçük / Orta / Büyük) | 'piece' (4'lü / 6'lı)
    piece_counts: { small: '', medium: '', large: '' },
    allergens: [],
    is_vegetarian: false,
    has_extras: false,
    calories: { portion: '', slice: '' },
    translations: emptyTranslations(PRODUCT_TR_FIELDS),
    imageFile: null,
    imagePreview: null,
});

const toForm = (p) => ({
    id: p.id,
    name: p.name,
    category_id: p.category_id,
    ingredients: p.ingredients || '',
    chef_note: p.chef_note || '',
    price: p.price,
    sizes: { small: p.sizes?.small ?? '', medium: p.sizes?.medium ?? '', large: p.sizes?.large ?? '' },
    pricing: isPiecePricing(p) ? 'piece' : 'size',
    piece_counts: { small: p.piece_counts?.small ?? '', medium: p.piece_counts?.medium ?? '', large: p.piece_counts?.large ?? '' },
    allergens: Array.isArray(p.allergens) ? p.allergens : [],
    is_vegetarian: !!p.is_vegetarian,
    has_extras: !!p.has_extras,
    calories: { portion: p.calories?.portion ?? '', slice: p.calories?.slice ?? '' },
    translations: emptyTranslations(PRODUCT_TR_FIELDS, p.translations),
    imageFile: null,
    imagePreview: getProductImage(p),
});

const Field = ({ label, hint, children }) => (
    <label className="block">
        <span className="block text-sm text-[#B5AEA3] mb-1.5">{label}</span>
        {children}
        {hint && <span className="block text-xs text-[#B5AEA3]/80 mt-1">{hint}</span>}
    </label>
);

const inputCls =
    'w-full h-11 px-3 bg-[#0D0C0B] border border-[#6E6B45]/35 rounded-[12px] text-sm text-[#F3EBDD] placeholder-[#B5AEA3]/50 focus:outline-none focus:border-[#6E6B45]';

// Telefon fotoğrafları 3-8 MB olur; sunucunun yükleme sınırına (PHP varsayılanı 2 MB) takılmasın diye
// yüklemeden önce en uzun kenar 1600 px'e indirilir ve JPEG'e çevrilir (~300-600 KB).
const MAX_IMAGE_SIDE = 1600;
const shrinkImage = async (file) => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    // Zaten küçük ve hafifse olduğu gibi gönder
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) {
        bitmap.close();
        return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; // şeffaf PNG'de JPEG arka planı siyah olmasın
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('canvas');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
};

const ProductForm = ({ initial, categories, onCancel, onSaved, onCategoryCreated }) => {
    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [newCategory, setNewCategory] = useState('');
    const [trLang, setTrLang] = useState('en');
    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const setTr = (field, value) =>
        setForm((f) => ({ ...f, translations: { ...f.translations, [trLang]: { ...f.translations[trLang], [field]: value } } }));

    const [preparingImage, setPreparingImage] = useState(false);

    const handleImage = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // aynı dosya tekrar seçilebilsin
        if (!file) return;
        setPreparingImage(true);
        setError(null);
        try {
            const prepared = await shrinkImage(file);
            set('imageFile', prepared);
            set('imagePreview', URL.createObjectURL(prepared));
        } catch {
            setError('Fotoğraf okunamadı. JPG, PNG veya WebP biçiminde bir fotoğraf seçin.');
        } finally {
            setPreparingImage(false);
        }
    };

    const addCategory = async () => {
        if (!newCategory.trim()) return;
        try {
            const cat = await apiService.createCategory(newCategory.trim());
            onCategoryCreated(cat);
            set('category_id', cat.id);
            setNewCategory('');
        } catch (err) {
            setError(errorMessage(err, 'Kategori eklenemedi.'));
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const data = new FormData();
        data.append('name', form.name.trim());
        data.append('category_id', form.category_id);
        data.append('ingredients', form.ingredients);
        data.append('chef_note', form.chef_note.trim());
        // Taban fiyat: girilmediyse orta boy fiyatı
        const isPiece = form.pricing === 'piece';
        // Adetli üründe fiyatı olmayan seçeneğin adedi de gönderilmez
        const sizes = isPiece
            ? Object.fromEntries(Object.entries(form.sizes).map(([k, v]) => [k, form.piece_counts[k] !== '' ? v : '']))
            : form.sizes;
        // Taban fiyat: boyda orta boy, adette ilk seçenek
        const basePrice = isPiece ? sizes.small || sizes.medium || sizes.large : sizes.medium || sizes.small || sizes.large;
        data.append('price', form.price !== '' && !isPiece ? form.price : basePrice || 0);
        data.append('sizes', JSON.stringify(sizes));
        data.append('piece_counts', JSON.stringify(isPiece ? form.piece_counts : {}));
        data.append('allergens', JSON.stringify(form.allergens));
        data.append('calories', JSON.stringify(form.calories));
        data.append('is_vegetarian', form.is_vegetarian ? '1' : '0');
        data.append('has_extras', form.has_extras ? '1' : '0');
        data.append('translations', JSON.stringify(form.translations));
        if (form.imageFile) data.append('image', form.imageFile);

        try {
            onSaved(await apiService.saveProduct(form.id, data));
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : errorMessage(err, 'Kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0D0C0B]/80 flex items-stretch md:items-center justify-center md:p-4">
            <form onSubmit={submit} className="w-full md:max-w-2xl bg-[#171513] md:border border-[#6E6B45]/35 md:rounded-[14px] h-full md:h-auto md:max-h-[92vh] flex flex-col">
                <div className="p-4 pl-5 border-b border-[#6E6B45]/30 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#F3EBDD]">{form.id ? 'Ürünü düzenle' : 'Yeni ürün'}</h3>
                    <button type="button" onClick={onCancel} className="min-h-[44px] px-3 rounded-[12px] bg-[#0D0C0B] border border-[#6E6B45]/30 flex items-center gap-1.5 text-sm text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer">
                        <X className="w-4 h-4" />
                        Vazgeç
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="flex gap-4">
                        {/* Fotoğraf (brif: menüdeki ürün fotoğrafları gerçek olmalı) */}
                        <label className="w-36 shrink-0 cursor-pointer">
                            <span className="block text-sm text-[#B5AEA3] mb-1.5">Fotoğraf</span>
                            <div className="w-36 aspect-[1024/849] rounded-[12px] bg-[#0D0C0B] border border-dashed border-[#F3EBDD]/20 overflow-hidden flex items-center justify-center">
                                {form.imagePreview ? (
                                    <img src={form.imagePreview} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="flex flex-col items-center gap-1 text-xs text-[#B5AEA3]">
                                        <Upload className="w-4 h-4" />
                                        Fotoğraf seç
                                    </span>
                                )}
                            </div>
                            <input type="file" accept="image/*" onChange={handleImage} disabled={preparingImage} className="sr-only" />
                            <span className="block text-xs text-[#B5AEA3]/80 mt-1">{preparingImage ? 'Fotoğraf hazırlanıyor...' : 'Gerçek ürün fotoğrafı. Büyük fotoğraflar otomatik küçültülür.'}</span>
                        </label>

                        <div className="flex-1 space-y-3">
                            <Field
                                label="Ürün adı"
                                hint={
                                    <>
                                        Menüde görünüm: <strong className="text-[#F3EBDD]">{productDisplayName(form.name) || '—'}</strong>.
                                        Küçük harf girilirse i → I olur (MARGHERITA). Türkçe adlarda "İ" için adı büyük harfle yazın (LİMONATA).
                                    </>
                                }
                            >
                                <input required maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
                            </Field>
                            <Field label="Kategori">
                                <select required value={form.category_id} onChange={(e) => set('category_id', Number(e.target.value))} className={inputCls}>
                                    <option value="" disabled>Seçin</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <div className="flex gap-2">
                                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Yeni kategori adı" className={inputCls} />
                                <button type="button" onClick={addCategory} className="h-11 px-3 rounded-[12px] bg-[#201E1B] border border-[#6E6B45]/35 text-sm text-[#F3EBDD] flex items-center gap-1.5 shrink-0 cursor-pointer">
                                    <Plus className="w-4 h-4" />
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>

                    <Field label="Malzemeler" hint="Menü kartındaki kısa açıklamada ve ürün detayında aynı metin gösterilir.">
                        <textarea maxLength={500} rows={2} value={form.ingredients} onChange={(e) => set('ingredients', e.target.value)} className={`${inputCls} h-auto py-2.5`} />
                    </Field>
                    <Field
                        label={
                            <span className="flex items-center gap-1.5">
                                <ChefHat className="w-4 h-4 text-[#E8A15A]" />
                                Şefin önerisi (isteğe bağlı)
                            </span>
                        }
                        hint="QR menüde ürün detayında şef simgesiyle gösterilir. Boş bırakılırsa gösterilmez."
                    >
                        <input maxLength={160} value={form.chef_note} onChange={(e) => set('chef_note', e.target.value)} placeholder="Örn: Yanında ev yapımı limonata çok iyi gider" className={inputCls} />
                    </Field>

                    {/* QR menü çevirileri: boş bırakılan alan müşteriye Türkçe gösterilir */}
                    <div className="rounded-[12px] border border-[#6E6B45]/30 bg-[#0D0C0B]/60 p-3.5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm text-[#F3EBDD]">
                                <Languages className="w-4 h-4 text-[#A6A277]" />
                                QR menü çevirileri
                            </span>
                            <div className="flex gap-1 p-1 bg-[#131210] rounded-[10px] border border-[#6E6B45]/30">
                                {TRANSLATION_LANGS.map(([code, label]) => (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => setTrLang(code)}
                                        aria-pressed={trLang === code}
                                        className={`min-h-[36px] px-2.5 rounded-[8px] text-xs flex items-center gap-1.5 cursor-pointer ${
                                            trLang === code ? 'bg-[#26231F] text-[#F3EBDD] font-semibold ring-1 ring-[#A6A277]/40' : 'text-[#B5AEA3] hover:text-[#F3EBDD]'
                                        }`}
                                    >
                                        <Flag lang={code} className="w-5 h-[13px]" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-[#B5AEA3]/80">İsteğe bağlı. Boş bırakılan alan müşteriye Türkçe gösterilir.</p>
                        <Field label="Ürün adı">
                            <input maxLength={80} value={form.translations[trLang].name} onChange={(e) => setTr('name', e.target.value)} placeholder={form.name} className={inputCls} />
                        </Field>
                        <Field label="Malzemeler">
                            <textarea maxLength={500} rows={2} value={form.translations[trLang].ingredients} onChange={(e) => setTr('ingredients', e.target.value)} placeholder={form.ingredients} className={`${inputCls} h-auto py-2.5`} />
                        </Field>
                        <Field label="Şefin önerisi">
                            <input maxLength={160} value={form.translations[trLang].chef_note} onChange={(e) => setTr('chef_note', e.target.value)} placeholder={form.chef_note} className={inputCls} />
                        </Field>
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm text-[#B5AEA3]">Fiyatlandırma</span>
                            <div className="flex gap-1 p-1 bg-[#131210] rounded-[10px] border border-[#6E6B45]/30">
                                {[['size', 'Boy (Küçük / Orta / Büyük)'], ['piece', "Adet (4'lü / 6'lı)"]].map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => set('pricing', key)}
                                        aria-pressed={form.pricing === key}
                                        className={`min-h-[36px] px-2.5 rounded-[8px] text-xs cursor-pointer ${
                                            form.pricing === key ? 'bg-[#26231F] text-[#F3EBDD] font-semibold ring-1 ring-[#A6A277]/40' : 'text-[#B5AEA3] hover:text-[#F3EBDD]'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.pricing === 'size' ? (
                            <>
                                <span className="block text-xs text-[#B5AEA3]/80">Fiyatlar (₺) — tek boylu üründe yalnızca "Orta"yı doldurun</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {[['small', 'Küçük'], ['medium', 'Orta'], ['large', 'Büyük']].map(([key, label]) => (
                                        <Field key={key} label={label}>
                                            <input
                                                type="number" min="0" step="1" inputMode="numeric"
                                                value={form.sizes[key]}
                                                required={key === 'medium'}
                                                onChange={(e) => set('sizes', { ...form.sizes, [key]: e.target.value })}
                                                className={`${inputCls} tabular-nums`}
                                            />
                                        </Field>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <span className="block text-xs text-[#B5AEA3]/80">
                                    En fazla 3 seçenek. Tek seçenekli üründe yalnızca ilk satırı doldurun. Menüde "4'lü", "6'lı" diye gösterilir.
                                </span>
                                {[['small', 1], ['medium', 2], ['large', 3]].map(([key, no]) => (
                                    <div key={key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                                        <Field label={`${no}. seçenek · adet`}>
                                            <input
                                                type="number" min="1" max="999" step="1" inputMode="numeric"
                                                value={form.piece_counts[key]}
                                                required={no === 1 || form.sizes[key] !== ''}
                                                onChange={(e) => set('piece_counts', { ...form.piece_counts, [key]: e.target.value })}
                                                placeholder={no === 1 ? 'Örn: 4' : no === 2 ? 'Örn: 6' : ''}
                                                className={`${inputCls} tabular-nums`}
                                            />
                                        </Field>
                                        <Field label="Fiyat (₺)">
                                            <input
                                                type="number" min="0" step="1" inputMode="numeric"
                                                value={form.sizes[key]}
                                                required={no === 1 || form.piece_counts[key] !== ''}
                                                onChange={(e) => set('sizes', { ...form.sizes, [key]: e.target.value })}
                                                className={`${inputCls} tabular-nums`}
                                            />
                                        </Field>
                                        <span className="h-11 min-w-[52px] flex items-center text-sm font-semibold text-[#A6A277]">
                                            {Number(form.piece_counts[key]) > 0 ? trPieceLabel(form.piece_counts[key]) : ''}
                                        </span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    <div>
                        <span className="block text-sm text-[#B5AEA3] mb-1.5">Alerjenler</span>
                        <div className="flex flex-wrap gap-2">
                            {ALLERGENS.map((a) => {
                                const on = form.allergens.includes(a);
                                return (
                                    <button
                                        key={a}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => set('allergens', on ? form.allergens.filter((x) => x !== a) : [...form.allergens, a])}
                                        className={`min-h-[40px] px-3.5 rounded-[10px] text-sm cursor-pointer border ${
                                            on ? 'bg-[#26231F] border-[#A6A277] text-[#F3EBDD] font-semibold' : 'bg-[#0D0C0B] border-[#6E6B45]/35 text-[#B5AEA3]'
                                        }`}
                                    >
                                        {a}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                        <input type="checkbox" checked={form.is_vegetarian} onChange={(e) => set('is_vegetarian', e.target.checked)} className="w-5 h-5 accent-[#6E6B45]" />
                        <span className="text-sm text-[#F3EBDD]">Vejetaryen</span>
                    </label>

                    <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
                        <input type="checkbox" checked={form.has_extras} onChange={(e) => set('has_extras', e.target.checked)} className="w-5 h-5 mt-0.5 accent-[#6E6B45]" />
                        <span>
                            <span className="block text-sm text-[#F3EBDD]">İlaveler gösterilsin</span>
                            <span className="block text-xs text-[#B5AEA3]/80">
                                QR menüde bu ürünün detayında ilave malzemeler ve fiyatları listelenir (menü ekranının altındaki "İlaveler" bölümünden düzenlenir).
                            </span>
                        </span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Kalori · porsiyon (kcal)">
                            <input type="number" min="0" value={form.calories.portion} onChange={(e) => set('calories', { ...form.calories, portion: e.target.value })} className={`${inputCls} tabular-nums`} />
                        </Field>
                        <Field label="Kalori · dilim (kcal, isteğe bağlı)" hint="Boş bırakılırsa QR menüde yalnızca porsiyon kalorisi gösterilir.">
                            <input type="number" min="0" value={form.calories.slice} onChange={(e) => set('calories', { ...form.calories, slice: e.target.value })} className={`${inputCls} tabular-nums`} />
                        </Field>
                    </div>
                </div>

                <div className="p-4 border-t border-[#6E6B45]/30 space-y-2">
                    {error && <div className="text-sm text-[#F3EBDD]">{error}</div>}
                    <button type="submit" disabled={saving || preparingImage} className="w-full min-h-[48px] rounded-[12px] bg-[#7B1E2B] hover:bg-[#9A2A38] text-sm font-semibold text-[#F3EBDD] cursor-pointer disabled:opacity-50">
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// Toplu fiyat: backend ile aynı hesap (tam TL'ye yuvarlanır)
const SIZE_SHORT = { small: 'K', medium: 'O', large: 'B' };
const adjustPrice = (price, { mode, direction, value }) => {
    const sign = direction === 'increase' ? 1 : -1;
    const v = Number(value) || 0;
    return Math.round(mode === 'percent' ? Number(price) * (1 + (sign * v) / 100) : Number(price) + sign * v);
};
const productPriceRows = (p) => {
    const sizes = p.sizes && typeof p.sizes === 'object' ? Object.entries(p.sizes).filter(([, v]) => v !== null && v !== '') : [];
    const label = (k) => (isPiecePricing(p) && p.piece_counts[k] ? trPieceLabel(p.piece_counts[k]) : SIZE_SHORT[k] || k);
    return sizes.length > 0 ? sizes.map(([k, v]) => [label(k), v]) : [[null, p.price]];
};

const BulkPriceModal = ({ products, onCancel, onApplied }) => {
    const [direction, setDirection] = useState('increase');
    const [mode, setMode] = useState('percent');
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const opts = { mode, direction, value };
    const valid = Number(value) > 0;
    const goesNonPositive = valid && products.some((p) => productPriceRows(p).some(([, v]) => adjustPrice(v, opts) <= 0));

    const submit = async (e) => {
        e.preventDefault();
        if (!valid || goesNonPositive) return;
        setSaving(true);
        setError(null);
        try {
            onApplied(await apiService.bulkUpdatePrices({ ids: products.map((p) => p.id), mode, direction, value: Number(value) }));
        } catch (err) {
            setError(errorMessage(err, 'Fiyatlar güncellenemedi.'));
            setSaving(false);
        }
    };

    const segment = (current, setter, options) => (
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#0D0C0B] rounded-[12px] border border-[#6E6B45]/30">
            {options.map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => setter(key)}
                    aria-pressed={current === key}
                    className={`min-h-[40px] rounded-[9px] text-sm cursor-pointer ${
                        current === key ? 'bg-[#26231F] text-[#F3EBDD] font-semibold ring-1 ring-[#A6A277]/40' : 'text-[#B5AEA3] hover:text-[#F3EBDD]'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-[#0D0C0B]/80 flex items-stretch md:items-center justify-center md:p-4">
            <form onSubmit={submit} className="w-full md:max-w-lg bg-[#171513] md:border border-[#6E6B45]/35 md:rounded-[14px] h-full md:h-auto md:max-h-[92vh] flex flex-col">
                <div className="p-4 pl-5 border-b border-[#6E6B45]/30 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#F3EBDD]">Toplu fiyat · {products.length} ürün</h3>
                    <button type="button" onClick={onCancel} className="min-h-[44px] px-3 rounded-[12px] bg-[#0D0C0B] border border-[#6E6B45]/30 flex items-center gap-1.5 text-sm text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer">
                        <X className="w-4 h-4" />
                        Vazgeç
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {segment(direction, setDirection, [['increase', 'Zam'], ['decrease', 'İndirim']])}
                    {segment(mode, setMode, [['percent', 'Yüzde (%)'], ['amount', 'Tutar (₺)']])}

                    <Field label={mode === 'percent' ? 'Yüzde' : 'Tutar (₺)'} hint="Tüm boy fiyatlarına uygulanır, sonuç tam TL'ye yuvarlanır.">
                        <div className="relative">
                            <input
                                type="number" min="0" step="any" inputMode="decimal" required autoFocus
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder={mode === 'percent' ? 'Örn: 10' : 'Örn: 25'}
                                className={`${inputCls} tabular-nums pr-10`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#B5AEA3]">{mode === 'percent' ? '%' : '₺'}</span>
                        </div>
                    </Field>

                    {/* Önizleme: eski → yeni fiyat (K / O / B: küçük / orta / büyük boy) */}
                    <div className="rounded-[12px] border border-[#6E6B45]/30 bg-[#0D0C0B]/60 divide-y divide-[#6E6B45]/20">
                        {products.map((p) => (
                            <div key={p.id} className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                <span className="text-sm font-semibold text-[#F3EBDD] truncate">{p.name}</span>
                                <span className="flex flex-wrap gap-x-3 text-xs tabular-nums text-[#B5AEA3]">
                                    {productPriceRows(p).map(([label, v]) => {
                                        const next = valid ? adjustPrice(v, opts) : null;
                                        return (
                                            <span key={label || 'base'}>
                                                {label && <span className="text-[#A6A277]">{label} </span>}
                                                {formatPrice(v)}
                                                {next !== null && (
                                                    <>
                                                        {' → '}
                                                        <span className={next <= 0 ? 'text-[#E07A88] font-semibold' : 'text-[#F3EBDD] font-semibold'}>{formatPrice(next)}</span>
                                                    </>
                                                )}
                                            </span>
                                        );
                                    })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-[#6E6B45]/30 space-y-2">
                    {goesNonPositive && <div className="text-sm text-[#E07A88]">Bazı fiyatlar 0 TL veya altına düşüyor. Daha küçük bir indirim girin.</div>}
                    {error && <div className="text-sm text-[#F3EBDD]">{error}</div>}
                    <button type="submit" disabled={saving || !valid || goesNonPositive} className="w-full min-h-[48px] rounded-[12px] bg-[#7B1E2B] hover:bg-[#9A2A38] text-sm font-semibold text-[#F3EBDD] cursor-pointer disabled:opacity-50">
                        {saving ? 'Güncelleniyor...' : `${products.length} ürünün fiyatını güncelle`}
                    </button>
                </div>
            </form>
        </div>
    );
};

const smallBtnCls =
    'min-h-[36px] px-3 rounded-[10px] bg-[#0F0E0D] border border-[#6E6B45]/35 hover:border-[#A6A277]/55 text-xs text-[#D9D1C3] hover:text-[#F3EBDD] flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50';

// Kategori başlığı: ad, ürün sayısı, QR menü çevirisi ve silme
const CategoryHeader = ({ category, count, accent, allSelected, onToggleAll, onUpdated, onDeleted }) => {
    const [editing, setEditing] = useState(false);
    const [names, setNames] = useState(() => emptyTranslations(['name'], category.translations));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const save = async () => {
        setBusy(true);
        setError(null);
        try {
            onUpdated(await apiService.updateCategory(category.id, { translations: names }));
            setEditing(false);
        } catch (err) {
            setError(errorMessage(err, 'Çeviriler kaydedilemedi.'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!confirm(`"${category.name}" kategorisi silinsin mi?`)) return;
        setBusy(true);
        setError(null);
        try {
            await apiService.deleteCategory(category.id);
            onDeleted(category.id);
        } catch (err) {
            setError(errorMessage(err, 'Kategori silinemedi.'));
            setBusy(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
                <h3 className="flex items-center gap-3 text-base font-semibold text-[#F3EBDD]">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${accent}`} />
                    {category.name}
                    <span className="text-xs font-normal text-[#B5AEA3] tabular-nums">{count} ürün</span>
                </h3>
                <span className="h-px flex-1 min-w-8 bg-gradient-to-r from-[#6E6B45]/40 to-transparent" />
                {count > 0 && (
                    <button type="button" onClick={onToggleAll} aria-pressed={allSelected} className={smallBtnCls}>
                        <Check className="w-3.5 h-3.5" />
                        {allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
                    </button>
                )}
                <button type="button" onClick={() => setEditing((v) => !v)} className={smallBtnCls}>
                    <Languages className="w-3.5 h-3.5" />
                    Çeviri
                </button>
                <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    title={count > 0 ? 'İçinde ürün olan kategori silinemez' : undefined}
                    className={smallBtnCls}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sil
                </button>
            </div>

            {editing && (
                <div className="rounded-[12px] border border-[#6E6B45]/30 bg-[#0D0C0B]/60 p-3 flex flex-wrap items-end gap-2">
                    {TRANSLATION_LANGS.map(([code, label]) => (
                        <label key={code} className="flex-1 min-w-[150px]">
                            <span className="flex items-center gap-1.5 text-xs text-[#B5AEA3] mb-1">
                                <Flag lang={code} className="w-5 h-[13px]" />
                                {label}
                            </span>
                            <input
                                maxLength={40}
                                value={names[code].name}
                                placeholder={category.name}
                                onChange={(e) => setNames((n) => ({ ...n, [code]: { name: e.target.value } }))}
                                className={inputCls}
                            />
                        </label>
                    ))}
                    <button type="button" onClick={save} disabled={busy} className={`${smallBtnCls} min-h-[44px] text-[#F3EBDD]`}>
                        <Check className="w-4 h-4" />
                        Kaydet
                    </button>
                </div>
            )}

            {error && <div className="px-3 py-2 rounded-[10px] bg-[#171513] border border-[#9A2A38]/50 text-sm text-[#F3EBDD]">{error}</div>}
        </div>
    );
};

// Panel: menü yönetimi (ürünler, kategoriler, ilaveler, toplu fiyat)
export const MenuManagementScreen = ({ onMenuChanged }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);
    const [busyId, setBusyId] = useState(null);
    // Toplu fiyat güncelleme için seçili ürünler
    const [selected, setSelected] = useState(() => new Set());
    const [bulkOpen, setBulkOpen] = useState(false);

    const toggleSelected = (ids, on) =>
        setSelected((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
            return next;
        });
    const selectedProducts = products.filter((p) => selected.has(p.id));

    const openBulk = () => {
        if (selectedProducts.length === 0) {
            setError('Önce fiyatı değişecek ürünleri soldaki kutucuklardan seçin.');
            return;
        }
        setError(null);
        setBulkOpen(true);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [prods, cats] = await Promise.all([apiService.getPanelProducts(), apiService.getCategories()]);
            setProducts(prods);
            setCategories(cats);
            setError(null);
        } catch (err) {
            setError(errorMessage(err, 'Menü yüklenemedi.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const replace = (updated) => {
        setProducts((prev) => {
            const exists = prev.some((p) => p.id === updated.id);
            return exists ? prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)) : [...prev, updated];
        });
        onMenuChanged?.();
    };

    const removeProduct = async (product) => {
        if (!confirm(`"${product.name}" kalıcı olarak silinsin mi? Bu işlem geri alınamaz.\n\nMenüden geçici olarak kaldırmak için "Gizle"yi kullanın.`)) return;
        setBusyId(product.id);
        setError(null);
        try {
            await apiService.deleteProduct(product.id);
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
            setSelected((prev) => {
                const next = new Set(prev);
                next.delete(product.id);
                return next;
            });
            onMenuChanged?.();
        } catch (err) {
            setError(errorMessage(err, 'Ürün silinemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    const toggle = async (product, field) => {
        setBusyId(product.id);
        setError(null);
        try {
            const updated =
                field === 'is_active'
                    ? await apiService.setProductAvailability(product.id, !product.is_active)
                    : await apiService.setProductVisibility(product.id, !product.is_visible);
            replace(updated);
        } catch (err) {
            setError(errorMessage(err, 'Güncellenemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="relative flex-1 p-4 md:p-6 overflow-y-auto space-y-6 min-h-0">
            {/* Üst kenarda bordo-haki akış çizgileri */}
            <FlowLines tone="mix" className="absolute top-0 right-0 w-2/3 h-28 opacity-80 pointer-events-none" />

            <div className="relative flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#6E6B45]/20">
                <div>
                    <h2 className="text-2xl font-semibold tracking-wide uppercase text-[#F3EBDD]">Menü</h2>
                    <p className="text-sm text-[#D9D1C3] mt-1">
                        Ürün, fiyat, fotoğraf ve tükendi durumu
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={openBulk}
                        title="Seçili ürünlere yüzde veya TL olarak zam / indirim"
                        className="min-h-[46px] px-5 rounded-[12px] bg-[#131210]/90 border border-[#6E6B45]/35 text-sm text-[#D9D1C3] hover:text-[#F3EBDD] hover:border-[#A6A277]/50 flex items-center gap-2 cursor-pointer"
                    >
                        <Percent className="w-4 h-4" />
                        Toplu fiyat{selectedProducts.length > 0 && ` (${selectedProducts.length})`}
                    </button>
                    <button onClick={load} className="min-h-[46px] px-5 rounded-[12px] bg-[#131210]/90 border border-[#6E6B45]/35 text-sm text-[#D9D1C3] hover:text-[#F3EBDD] hover:border-[#A6A277]/50 flex items-center gap-2 cursor-pointer">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </button>
                    <button
                        onClick={() => setEditing(emptyForm(categories[0]?.id))}
                        className="min-h-[46px] px-5 rounded-[12px] bg-gradient-to-r from-[#7B1E2B] to-[#5A1520] hover:from-[#9A2A38] hover:to-[#7B1E2B] ring-1 ring-[#9A2A38]/50 shadow-[0_8px_24px_rgba(123,30,43,0.35)] text-sm font-semibold text-[#F3EBDD] flex items-center gap-2 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Yeni ürün
                    </button>
                </div>
            </div>

            {error && <div className="px-4 py-2.5 rounded-[12px] bg-[#171513] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">{error}</div>}

            {categories.map((cat, catIndex) => {
                const items = products.filter((p) => p.category_id === cat.id);
                return (
                    <section key={cat.id} className="relative space-y-2.5">
                        {/* Kategori başlığı: nokta + ad + ürün sayısı + çeviri / sil */}
                        <CategoryHeader
                            category={cat}
                            count={items.length}
                            accent={catIndex === 0 ? 'bg-[#A6A277]' : 'bg-[#9A2A38]'}
                            allSelected={items.length > 0 && items.every((p) => selected.has(p.id))}
                            onToggleAll={() => toggleSelected(items.map((p) => p.id), !items.every((p) => selected.has(p.id)))}
                            onUpdated={(updated) => {
                                setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                                onMenuChanged?.();
                            }}
                            onDeleted={(id) => {
                                setCategories((prev) => prev.filter((c) => c.id !== id));
                                onMenuChanged?.();
                            }}
                        />
                        {items.length === 0 && (
                            <p className="px-4 py-3 rounded-[12px] border border-dashed border-[#6E6B45]/30 text-sm text-[#B5AEA3]">
                                Bu kategoride ürün yok.
                            </p>
                        )}
                        {items.map((p) => {
                            const img = getProductImage(p, 'thumb');
                            return (
                                <div
                                    key={p.id}
                                    className={`group relative overflow-hidden rounded-[14px] pl-5 pr-3 py-3 flex items-center gap-4 bg-gradient-to-r from-[#1A1815] to-[#121110] border border-[#6E6B45]/25 hover:border-[#A6A277]/40 transition-colors ${p.is_visible ? '' : 'opacity-55'}`}
                                >
                                    {/* Sol şerit: satışta bordo, tükendi haki */}
                                    <span className={`absolute left-0 top-0 bottom-0 w-[5px] ${p.is_active ? 'bg-[#9A2A38]' : 'bg-[#8A8659]'}`} aria-hidden="true" />

                                    <input
                                        type="checkbox"
                                        checked={selected.has(p.id)}
                                        onChange={(e) => toggleSelected([p.id], e.target.checked)}
                                        aria-label={`${p.name} toplu fiyat için seç`}
                                        className="w-5 h-5 shrink-0 accent-[#9A2A38] cursor-pointer"
                                    />

                                    {img ? (
                                        <img src={img} alt="" className="w-[68px] aspect-[1024/849] rounded-[10px] object-cover shrink-0 ring-1 ring-[#6E6B45]/30" />
                                    ) : (
                                        <div className="w-[68px] aspect-[1024/849] rounded-[10px] bg-[#0D0C0B] border border-dashed border-[#6E6B45]/40 shrink-0 flex items-center justify-center text-[10px] text-[#B5AEA3]">
                                            Fotoğraf yok
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 pl-1">
                                        <div className="text-[14px] font-semibold tracking-wide text-[#F3EBDD] truncate">{p.name}</div>
                                        <div className="text-sm text-[#D9D1C3] tabular-nums mt-0.5">
                                            {formatPrice(priceForSize(p, getDefaultSize(p)))}
                                            {p.has_extras && <span className="text-[#E8A15A]"> · İlaveli</span>}
                                            {!p.is_visible && ' · Menüden kaldırıldı'}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggle(p, 'is_active')}
                                        disabled={busyId === p.id}
                                        aria-pressed={!p.is_active}
                                        className={`min-h-[42px] min-w-[108px] px-4 rounded-[10px] text-sm font-semibold border flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transition-colors ${
                                            p.is_active
                                                ? 'bg-[#3A141A] hover:bg-[#4A1820] border-[#7B1E2B]/70 text-[#F3EBDD]'
                                                : 'bg-[#26231F] border-[#A6A277]/70 text-[#D9D1C3]'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-[#8FA35A]' : 'bg-[#B5AEA3]/60'}`} />
                                        {p.is_active ? 'Satışta' : 'Tükendi'}
                                    </button>

                                    <button
                                        onClick={() => toggle(p, 'is_visible')}
                                        disabled={busyId === p.id}
                                        className="hidden sm:flex min-h-[42px] px-3.5 rounded-[10px] bg-[#0F0E0D] border border-[#6E6B45]/35 hover:border-[#A6A277]/55 text-sm text-[#D9D1C3] hover:text-[#F3EBDD] items-center gap-1.5 cursor-pointer transition-colors"
                                    >
                                        {p.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        {p.is_visible ? 'Gizle' : 'Göster'}
                                    </button>
                                    <button
                                        onClick={() => setEditing(toForm(p))}
                                        className="min-h-[42px] px-3.5 rounded-[10px] bg-[#0F0E0D] border border-[#6E6B45]/35 hover:border-[#A6A277]/55 text-sm text-[#F3EBDD] flex items-center gap-1.5 cursor-pointer transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Düzenle
                                    </button>
                                    <button
                                        onClick={() => removeProduct(p)}
                                        disabled={busyId === p.id}
                                        title="Ürünü kalıcı olarak sil"
                                        aria-label={`${p.name} ürününü sil`}
                                        className="min-h-[42px] px-3 rounded-[10px] bg-[#0F0E0D] border border-[#6E6B45]/35 hover:border-[#9A2A38] hover:bg-[#3A141A] text-sm text-[#D9D1C3] hover:text-[#F3EBDD] flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="hidden md:inline">Sil</span>
                                    </button>
                                </div>
                            );
                        })}
                    </section>
                );
            })}

            {!loading && <ExtrasManager onChanged={onMenuChanged} />}

            {bulkOpen && (
                <BulkPriceModal
                    products={selectedProducts}
                    onCancel={() => setBulkOpen(false)}
                    onApplied={(updated) => {
                        const byId = Object.fromEntries(updated.map((u) => [u.id, u]));
                        setProducts((prev) => prev.map((p) => (byId[p.id] ? { ...p, ...byId[p.id] } : p)));
                        onMenuChanged?.();
                        setSelected(new Set());
                        setBulkOpen(false);
                    }}
                />
            )}

            {editing && (
                <ProductForm
                    initial={editing}
                    categories={categories}
                    onCancel={() => setEditing(null)}
                    onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
                    onSaved={(saved) => {
                        replace(saved);
                        setEditing(null);
                    }}
                />
            )}
        </div>
    );
};
