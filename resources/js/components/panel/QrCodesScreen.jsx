import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Copy, Check } from 'lucide-react';

const QR_OPTIONS = { width: 600, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0D0C0B', light: '#FFFFFF' } };

// Tüm masalarda aynı QR: menüyü açar
const MENU_URL = `${window.location.origin}/menu`;

// Masalara konacak yazdırılabilir QR kartı
const printCard = (qrImage) => {
    const win = window.open('', '_blank');
    if (!win) {
        alert('Yazdırma penceresi açılamadı. Lütfen tarayıcıda açılır pencerelere izin verin.');
        return;
    }

    win.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Unopia Menü QR Kodu</title>
        <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; margin: 0; }
            .card { width: 90mm; margin: 10mm auto; border: 1.5px dashed #999; border-radius: 6mm; padding: 8mm; text-align: center; }
            .brand { font-weight: 900; letter-spacing: 3px; font-size: 20pt; }
            img { width: 70mm; height: 70mm; margin: 4mm auto; display: block; }
            .hint { color: #555; font-size: 11pt; margin-top: 1mm; }
        </style></head><body>
        <div class="card">
            <div class="brand">UNOPIA</div>
            <img src="${qrImage}" alt="Menü QR" />
            <div class="hint">Menüyü görmek için okutun</div>
        </div>
        <script>window.onload = function () { window.focus(); window.print(); };<\/script></body></html>`);
    win.document.close();
};

// Tek menü QR kodu: görüntüleme, indirme, yazdırma, linki kopyalama
export const QrCodesScreen = () => {
    const [qrImage, setQrImage] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        QRCode.toDataURL(MENU_URL, QR_OPTIONS)
            .then(setQrImage)
            .catch(() => setError('QR kod oluşturulamadı.'));
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(MENU_URL);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setError('Link kopyalanamadı.');
        }
    };

    const actionCls =
        'min-h-[48px] flex items-center justify-center gap-2 rounded-[12px] text-sm font-semibold cursor-pointer disabled:opacity-40';

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 min-h-0">
            <div>
                <h2 className="font-heading text-xl tracking-wide uppercase text-[#F3EBDD]">QR kod</h2>
                <p className="text-sm text-[#A6A277] mt-0.5">
                    Tüm masalarda aynı QR kod kullanılır. Müşteri okuttuğunda menü açılır.
                </p>
            </div>

            {error && (
                <div className="px-4 py-2.5 rounded-[12px] bg-[#171513] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">
                    {error}
                </div>
            )}

            <div className="max-w-sm mx-auto rounded-[14px] bg-[#171513] border border-[#6E6B45]/25 p-5 flex flex-col gap-4">
                <div className="bg-white rounded-[12px] p-3">
                    {qrImage ? (
                        <img src={qrImage} alt="Menü QR kodu" className="w-full aspect-square" />
                    ) : (
                        <div className="w-full aspect-square" />
                    )}
                </div>

                <div className="truncate text-xs text-[#B5AEA3] text-center" title={MENU_URL}>{MENU_URL}</div>
                <button onClick={handleCopy} className="min-h-[40px] rounded-[10px] bg-[#0D0C0B] hover:bg-[#201E1B] text-xs text-[#B5AEA3] hover:text-[#F3EBDD] flex items-center justify-center gap-1.5 cursor-pointer">
                    {copied ? <Check className="w-3.5 h-3.5 text-[#A6A277]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Kopyalandı' : 'Linki kopyala'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                    <a
                        href={qrImage || undefined}
                        download="unopia-menu-qr.png"
                        aria-disabled={!qrImage}
                        className={`${actionCls} bg-[#0D0C0B] hover:bg-[#201E1B] text-[#D9D1C3] hover:text-[#F3EBDD] border border-[#6E6B45]/30`}
                    >
                        <Download className="w-4 h-4" />
                        İndir
                    </a>
                    <button
                        onClick={() => printCard(qrImage)}
                        disabled={!qrImage}
                        className={`${actionCls} bg-[#7B1E2B] hover:bg-[#9A2A38] text-[#F3EBDD]`}
                    >
                        <Printer className="w-4 h-4" />
                        Yazdır
                    </button>
                </div>
            </div>
        </div>
    );
};
