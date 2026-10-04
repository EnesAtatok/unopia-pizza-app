import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, RefreshCw, Plus, Copy, Check } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';

const QR_OPTIONS = { width: 600, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0D0C0B', light: '#FFFFFF' } };

const fileSafe = (name) =>
    name.toLocaleLowerCase('tr-TR')
        .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Masalara konacak yazdırılabilir QR kartları (her kart bir masa)
const printCards = (tables, qrImages) => {
    const win = window.open('', '_blank');
    if (!win) {
        alert('Yazdırma penceresi açılamadı. Lütfen tarayıcıda açılır pencerelere izin verin.');
        return;
    }
    const cards = tables.map((t) => `
        <div class="card">
            <div class="brand">UNOPIA</div>
            <img src="${qrImages[t.id]}" alt="${escapeHtml(t.name)} QR" />
            <div class="table">${escapeHtml(t.name)}</div>
            <div class="hint">Menü ve sipariş için okutun</div>
        </div>`).join('');

    win.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Unopia Masa QR Kodları</title>
        <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; margin: 0; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10mm; }
            .card { border: 1.5px dashed #999; border-radius: 6mm; padding: 6mm; text-align: center; break-inside: avoid; }
            .brand { font-weight: 900; letter-spacing: 3px; font-size: 18pt; }
            img { width: 60mm; height: 60mm; margin: 3mm auto; display: block; }
            .table { font-weight: 800; font-size: 20pt; }
            .hint { color: #555; font-size: 10pt; margin-top: 1mm; }
        </style></head><body><div class="grid">${cards}</div>
        <script>window.onload = function () { window.focus(); window.print(); };<\/script></body></html>`);
    win.document.close();
};

// Garson: QR kodları görüntüler, yazdırır, indirir. Masa ekleme / pasif yapma / QR yenileme yalnızca yönetici.
export const QrCodesScreen = () => {
    const { isManager } = useAuth();
    const [tables, setTables] = useState([]);
    const [qrImages, setQrImages] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [newName, setNewName] = useState('');
    const [newSection, setNewSection] = useState('salon');

    const errorText = errorMessage;

    const renderQrs = async (list) => {
        const entries = await Promise.all(list.map(async (t) => [t.id, await QRCode.toDataURL(t.qr_url, QR_OPTIONS)]));
        setQrImages((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await apiService.getQrTables();
            setTables(list);
            await renderQrs(list);
        } catch (err) {
            setError(errorText(err, 'Masalar yüklenemedi.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const replaceTable = async (updated) => {
        setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        await renderQrs([updated]);
    };

    const handleRegenerate = async (table) => {
        if (!confirm(`${table.name} için yeni QR kod üretilecek. Masadaki eski QR kod artık ÇALIŞMAYACAK ve yenisini basıp değiştirmeniz gerekecek. Devam edilsin mi?`)) return;
        setBusyId(table.id);
        setError(null);
        try {
            await replaceTable(await apiService.regenerateQrTable(table.id));
        } catch (err) {
            setError(errorText(err, 'QR kod yenilenemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleToggleActive = async (table) => {
        setBusyId(table.id);
        setError(null);
        try {
            await replaceTable(await apiService.setQrTableActive(table.id, !table.is_active));
        } catch (err) {
            setError(errorText(err, 'Masa durumu değiştirilemedi.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setError(null);
        try {
            const created = await apiService.createQrTable({ name: newName.trim(), section: newSection });
            setTables((prev) => [...prev, created]);
            await renderQrs([created]);
            setNewName('');
        } catch (err) {
            setError(errorText(err, 'Masa eklenemedi.'));
        }
    };

    const handleCopy = async (table) => {
        try {
            await navigator.clipboard.writeText(table.qr_url);
            setCopiedId(table.id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            setError('Link kopyalanamadı.');
        }
    };

    const activeTables = tables.filter((t) => t.is_active);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 min-h-0">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-heading text-xl tracking-wide uppercase text-[#F3EBDD]">QR kodlar</h2>
                    <p className="text-sm text-[#A6A277] mt-0.5">
                        Her masanın kendine ait QR kodu vardır. Müşteri okuttuğunda menü o masa için açılır, sipariş ve garson çağrısı doğrudan o masaya düşer.
                    </p>
                </div>
                <button
                    onClick={() => printCards(activeTables, qrImages)}
                    disabled={activeTables.length === 0}
                    className="min-h-[44px] flex items-center gap-2 px-4 rounded-[12px] bg-[#7B1E2B] hover:bg-[#9A2A38] disabled:opacity-40 text-sm font-semibold text-[#F3EBDD] cursor-pointer"
                >
                    <Printer className="w-4 h-4" />
                    Tümünü yazdır ({activeTables.length})
                </button>
            </div>

            {/* Yeni masa (yönetici) */}
            {isManager && (
            <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2 p-3 rounded-[14px] bg-[#171513] border border-[#6E6B45]/25">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Yeni masa adı (örn: Masa 11)"
                    maxLength={50}
                    className="flex-1 min-w-[180px] px-4 py-2.5 bg-[#0D0C0B] border border-[#6E6B45]/30 rounded-full text-xs text-[#F3EBDD] placeholder-[#B5AEA3]/50 focus:outline-none focus:border-[#6E6B45]"
                />
                <select
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="px-4 py-2.5 bg-[#0D0C0B] border border-[#6E6B45]/30 rounded-full text-xs text-[#F3EBDD] focus:outline-none cursor-pointer"
                >
                    <option value="salon">Salon</option>
                    <option value="bahce">Bahçe</option>
                </select>
                <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#7B1E2B] hover:bg-[#9A2A38] text-xs font-semibold text-[#F3EBDD] cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Masa Ekle
                </button>
            </form>
            )}

            {error && (
                <div className="px-4 py-2.5 rounded-[12px] bg-[#171513] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-sm text-[#B5AEA3] py-10 text-center">Yükleniyor...</div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
                    {tables.map((t) => (
                        <div
                            key={t.id}
                            className={`rounded-[14px] bg-[#171513] border border-[#6E6B45]/25 p-4 flex flex-col gap-3 ${t.is_active ? '' : 'opacity-50'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[15px] font-semibold text-[#F3EBDD]">{t.name}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-[#A6A277]">
                                        {t.section === 'bahce' ? 'Bahçe' : 'Salon'}{!t.is_active && ' · Pasif'}
                                    </div>
                                </div>
                                {isManager && (
                                    <button
                                        onClick={() => handleToggleActive(t)}
                                        disabled={busyId === t.id}
                                        className="text-[10px] px-2.5 py-1 rounded-full border border-[#F3EBDD]/15 text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer"
                                        title={t.is_active ? 'Pasif masanın QR kodu çalışmaz' : 'Masayı tekrar aktif et'}
                                    >
                                        {t.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                    </button>
                                )}
                            </div>

                            <div className="bg-white rounded-[12px] p-2">
                                {qrImages[t.id] ? (
                                    <img src={qrImages[t.id]} alt={`${t.name} QR kodu`} className="w-full aspect-square" />
                                ) : (
                                    <div className="w-full aspect-square" />
                                )}
                            </div>

                            <div className="truncate text-xs text-[#B5AEA3]" title={t.qr_url}>{t.qr_url}</div>
                            {/* Panelden müşteri ekranı açılmaz: yalnızca link kopyalanır */}
                            <button onClick={() => handleCopy(t)} className="min-h-[40px] rounded-[10px] bg-[#0D0C0B] hover:bg-[#201E1B] text-xs text-[#B5AEA3] hover:text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer">
                                {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-[#A6A277]" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedId === t.id ? 'Kopyalandı' : 'Linki kopyala'}
                            </button>

                            <div className={`grid gap-1.5 ${isManager ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                <a
                                    href={qrImages[t.id]}
                                    download={`unopia-qr-${fileSafe(t.name)}.png`}
                                    className="min-h-[44px] flex flex-col items-center justify-center gap-1 py-1.5 rounded-[10px] bg-[#0D0C0B] hover:bg-[#201E1B] text-xs text-[#B5AEA3] hover:text-[#F3EBDD]"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    İndir
                                </a>
                                <button
                                    onClick={() => printCards([t], qrImages)}
                                    className="min-h-[44px] flex flex-col items-center justify-center gap-1 py-1.5 rounded-[10px] bg-[#0D0C0B] hover:bg-[#201E1B] text-xs text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Yazdır
                                </button>
                                {isManager && (
                                    <button
                                        onClick={() => handleRegenerate(t)}
                                        disabled={busyId === t.id}
                                        className="min-h-[44px] flex flex-col items-center justify-center gap-1 py-1.5 rounded-[10px] bg-[#0D0C0B] hover:bg-[#201E1B] text-xs text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer disabled:opacity-50"
                                        title="Eski QR kod geçersiz olur"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${busyId === t.id ? 'animate-spin' : ''}`} />
                                        Yenile
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
