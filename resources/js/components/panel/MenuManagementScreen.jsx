import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Upload, RefreshCw, EyeOff, Eye } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { FlowLines } from '../common/Icons';
import { getProductImage, formatPrice, getDefaultSize, priceForSize, productDisplayName } from '../../productImage';

const ALLERGENS = ['Gluten', 'Süt', 'Yumurta', 'Fındık', 'Ceviz', 'Susam', 'Soya'];

const emptyForm = (categoryId) => ({
    id: null,
    name: '',
    category_id: categoryId || '',
    description: '',
    ingredients: '',
    price: '',
    sizes: { small: '', medium: '', large: '' },
    allergens: [],
    is_vegetarian: false,
    calories: { portion: '', slice: '' },
    imageFile: null,
    imagePreview: null,
});

const toForm = (p) => ({
    id: p.id,
    name: p.name,
    category_id: p.category_id,
    description: p.description || '',
    ingredients: p.ingredients || '',
    price: p.price,
    sizes: { small: p.sizes?.small ?? '', medium: p.sizes?.medium ?? '', large: p.sizes?.large ?? '' },
    allergens: Array.isArray(p.allergens) ? p.allergens : [],
    is_vegetarian: !!p.is_vegetarian,
    calories: { portion: p.calories?.portion ?? '', slice: p.calories?.slice ?? '' },
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

const ProductForm = ({ initial, categories, onCancel, onSaved, onCategoryCreated }) => {
    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [newCategory, setNewCategory] = useState('');

    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const handleImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        set('imageFile', file);
        set('imagePreview', URL.createObjectURL(file));
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
        data.append('description', form.description);
        data.append('ingredients', form.ingredients);
        // Taban fiyat: girilmediyse orta boy fiyatı
        data.append('price', form.price !== '' ? form.price : form.sizes.medium || 0);
        data.append('sizes', JSON.stringify(form.sizes));
        data.append('allergens', JSON.stringify(form.allergens));
        data.append('calories', JSON.stringify(form.calories));
        data.append('is_vegetarian', form.is_vegetarian ? '1' : '0');
        if (form.imageFile) data.append('image', form.imageFile);

        try {
            const saved = await apiService.saveProduct(form.id, data);
            onSaved(saved);
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
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="sr-only" />
                            <span className="block text-xs text-[#B5AEA3]/80 mt-1">Gerçek ürün fotoğrafı, en fazla 5 MB</span>
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

                    <Field label="Kısa açıklama (menü kartında)">
                        <input maxLength={255} value={form.description} onChange={(e) => set('description', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Malzemeler (ürün detayında)">
                        <textarea maxLength={500} rows={2} value={form.ingredients} onChange={(e) => set('ingredients', e.target.value)} className={`${inputCls} h-auto py-2.5`} />
                    </Field>

                    <div>
                        <span className="block text-sm text-[#B5AEA3] mb-1.5">Fiyatlar (₺) — tek boylu üründe yalnızca "Orta"yı doldurun</span>
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

                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Kalori · porsiyon (kcal)">
                            <input type="number" min="0" value={form.calories.portion} onChange={(e) => set('calories', { ...form.calories, portion: e.target.value })} className={`${inputCls} tabular-nums`} />
                        </Field>
                        <Field label="Kalori · dilim (kcal)">
                            <input type="number" min="0" value={form.calories.slice} onChange={(e) => set('calories', { ...form.calories, slice: e.target.value })} className={`${inputCls} tabular-nums`} />
                        </Field>
                    </div>
                </div>

                <div className="p-4 border-t border-[#6E6B45]/30 space-y-2">
                    {error && <div className="text-sm text-[#F3EBDD]">{error}</div>}
                    <button type="submit" disabled={saving} className="w-full min-h-[48px] rounded-[12px] bg-[#7B1E2B] hover:bg-[#9A2A38] text-sm font-semibold text-[#F3EBDD] cursor-pointer disabled:opacity-50">
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// Yalnızca yönetici açar (garson menü ekranını görmez)
export const MenuManagementScreen = ({ onMenuChanged }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);
    const [busyId, setBusyId] = useState(null);

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
                <div className="flex items-center gap-2">
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
                if (items.length === 0) return null;
                return (
                    <section key={cat.id} className="relative space-y-2.5">
                        {/* Kategori başlığı: nokta + ad + ince çizgi */}
                        <h3 className="flex items-center gap-3 text-base font-semibold text-[#F3EBDD]">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${catIndex === 0 ? 'bg-[#A6A277]' : 'bg-[#9A2A38]'}`} />
                            {cat.name}
                            <span className="h-px w-24 bg-gradient-to-r from-[#6E6B45]/40 to-transparent" />
                        </h3>
                        {items.map((p) => {
                            const img = getProductImage(p, 'thumb');
                            return (
                                <div
                                    key={p.id}
                                    className={`group relative overflow-hidden rounded-[14px] pl-5 pr-3 py-3 flex items-center gap-4 bg-gradient-to-r from-[#1A1815] to-[#121110] border border-[#6E6B45]/25 hover:border-[#A6A277]/40 transition-colors ${p.is_visible ? '' : 'opacity-55'}`}
                                >
                                    {/* Sol şerit: satışta bordo, tükendi haki */}
                                    <span className={`absolute left-0 top-0 bottom-0 w-[5px] ${p.is_active ? 'bg-[#9A2A38]' : 'bg-[#8A8659]'}`} aria-hidden="true" />

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
                                </div>
                            );
                        })}
                    </section>
                );
            })}

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
