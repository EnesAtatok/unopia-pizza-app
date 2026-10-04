import React, { useState } from 'react';
import { X, Plus, Minus, Search, Check } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { getSizeOptions, getDefaultSize, priceForSize, formatPrice, matchesSearch } from '../../productImage';

// Brif: "Ürün ekle — garsonun masaya ürün eklediği ekran, en sık kullanılacak yer".
// Pencere ekledikten sonra açık kalır: garson art arda birkaç ürün girebilir.
export const AddProductModal = ({ table, products = [], categories = [], onClose, onRefresh }) => {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [size, setSize] = useState('Orta');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [added, setAdded] = useState([]); // bu pencerede eklenenler

    const activeCatId = selectedCategory || categories[0]?.id || null;
    const isSearching = search.trim() !== '';
    const filtered = products.filter((p) =>
        isSearching ? matchesSearch(p, search) : !activeCatId || p.category_id === activeCatId
    );

    const selectProduct = (prod) => {
        if (!prod.is_active) return;
        setSelected(prod);
        setSize(getDefaultSize(prod));
        setQuantity(1);
        setNotes('');
        setError(null);
    };

    const handleAdd = async () => {
        if (!selected || busy) return;
        setBusy(true);
        setError(null);
        try {
            await apiService.addItemToTable({
                table: table.name,
                product_id: selected.id,
                quantity,
                size,
                notes: notes.trim() || null,
            });
            setAdded((prev) => [...prev, `${quantity}× ${selected.name}${getSizeOptions(selected).length > 1 ? ` (${size})` : ''}`]);
            setSelected(null);
            onRefresh();
        } catch (err) {
            setError(errorMessage(err, 'Ürün eklenemedi.'));
        } finally {
            setBusy(false);
        }
    };

    const sizeOptions = selected ? getSizeOptions(selected) : [];

    return (
        <div className="fixed inset-0 z-50 bg-[#0D0C0B]/80 flex items-stretch md:items-center justify-center md:p-4">
            <div className="w-full md:max-w-3xl bg-[#171513] md:border border-[#6E6B45]/35 md:rounded-[14px] h-full md:h-auto md:max-h-[92vh] flex flex-col">
                {/* Başlık */}
                <div className="p-4 pl-5 border-b border-[#6E6B45]/30 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-[#F3EBDD]">{table.name} · Ürün ekle</h3>
                        <p className="text-sm text-[#A6A277] truncate">
                            {added.length > 0 ? `Eklendi: ${added.join(', ')}` : 'Ürüne dokunun, boyu seçip ekleyin'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="min-h-[44px] px-3 rounded-[12px] bg-[#0D0C0B] border border-[#6E6B45]/30 flex items-center gap-1.5 text-sm text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer shrink-0"
                    >
                        {added.length > 0 ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {added.length > 0 ? 'Bitti' : 'Kapat'}
                    </button>
                </div>

                {/* Arama ve kategoriler */}
                <div className="p-3 border-b border-[#6E6B45]/30 space-y-2.5">
                    <div className="relative">
                        <Search className="w-4 h-4 text-[#B5AEA3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="search"
                            placeholder="Ürün ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-11 pl-10 pr-4 bg-[#0D0C0B] border border-[#6E6B45]/30 rounded-[12px] text-sm text-[#F3EBDD] focus:outline-none focus:border-[#6E6B45]"
                        />
                    </div>
                    {!isSearching && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {categories.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCategory(c.id)}
                                    className={`min-h-[40px] px-4 rounded-[10px] text-sm whitespace-nowrap cursor-pointer ${
                                        c.id === activeCatId
                                            ? 'bg-[#6E6B45] text-[#F3EBDD] font-semibold border border-[#6E6B45]'
                                            : 'bg-[#0D0C0B] text-[#B5AEA3] border border-[#6E6B45]/25 hover:text-[#F3EBDD]'
                                    }`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ürünler */}
                <div className="p-3 flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 content-start">
                    {filtered.map((prod) => {
                        const isSelected = selected?.id === prod.id;
                        const soldOut = !prod.is_active;
                        return (
                            <button
                                key={prod.id}
                                type="button"
                                onClick={() => selectProduct(prod)}
                                disabled={soldOut}
                                className={`text-left min-h-[76px] p-3 rounded-[14px] border transition-colors flex flex-col justify-between cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${
                                    isSelected
                                        ? 'bg-[#26231F] border-[#A6A277]'
                                        : 'bg-[#0D0C0B] border-[#6E6B45]/30 hover:border-[#F3EBDD]/25'
                                }`}
                            >
                                <span className="text-sm font-semibold text-[#F3EBDD] leading-tight">{prod.name}</span>
                                <span className="mt-2 text-sm text-[#B5AEA3] tabular-nums">
                                    {soldOut ? 'Tükendi' : formatPrice(priceForSize(prod, getDefaultSize(prod)))}
                                </span>
                            </button>
                        );
                    })}
                    {filtered.length === 0 && <div className="col-span-full py-10 text-center text-sm text-[#B5AEA3]">Ürün bulunamadı.</div>}
                </div>

                {/* Seçili ürün: boy, adet, not, ekle */}
                {selected && (
                    <div className="p-3 border-t border-[#6E6B45]/30 bg-[#0D0C0B] space-y-2.5">
                        {error && <div className="text-sm text-[#F3EBDD] px-1">{error}</div>}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[#F3EBDD] mr-auto">{selected.name}</span>
                            {sizeOptions.length > 1 &&
                                sizeOptions.map((sz) => (
                                    <button
                                        key={sz.label}
                                        type="button"
                                        onClick={() => setSize(sz.label)}
                                        className={`min-h-[44px] px-3.5 rounded-[12px] text-sm cursor-pointer tabular-nums ${
                                            size === sz.label
                                                ? 'bg-[#26231F] text-[#F3EBDD] font-semibold border border-[#A6A277]'
                                                : 'bg-[#171513] text-[#B5AEA3] border border-[#6E6B45]/30'
                                        }`}
                                    >
                                        {sz.label} {formatPrice(sz.price)}
                                    </button>
                                ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Not (opsiyonel)"
                                value={notes}
                                maxLength={200}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex-1 min-w-0 h-11 px-3 bg-[#171513] border border-[#6E6B45]/30 rounded-[12px] text-sm text-[#F3EBDD] focus:outline-none focus:border-[#6E6B45]"
                            />
                            <div className="flex items-center bg-[#171513] border border-[#6E6B45]/30 rounded-[12px]">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    aria-label="Adet azalt"
                                    className="w-11 h-11 flex items-center justify-center text-[#F3EBDD] cursor-pointer"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-semibold w-5 text-center tabular-nums">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(Math.min(50, quantity + 1))}
                                    aria-label="Adet artır"
                                    className="w-11 h-11 flex items-center justify-center text-[#F3EBDD] cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={busy}
                                className="h-11 px-4 rounded-[12px] bg-[#7B1E2B] hover:bg-[#9A2A38] text-sm font-semibold text-[#F3EBDD] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 tabular-nums"
                            >
                                <Plus className="w-4 h-4" />
                                {busy ? 'Ekleniyor' : `Ekle · ${formatPrice(priceForSize(selected, size) * quantity)}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
