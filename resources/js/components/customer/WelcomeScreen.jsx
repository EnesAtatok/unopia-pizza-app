import React, { useState, useEffect } from 'react';
import { ChevronRight, Star, MapPin } from 'lucide-react';
import { BUSINESS, isOpenNow } from '../../config/business';
import { InstagramIcon, WhatsAppIcon, KidPlayIcon, SauceDrips } from '../common/Icons';

const LINKS = [
    { label: 'Bizi Değerlendir', href: BUSINESS.googleReviews, Icon: Star },
    { label: 'WhatsApp', href: `https://wa.me/${BUSINESS.whatsapp}`, Icon: WhatsAppIcon },
    { label: 'Instagram', href: BUSINESS.instagram, Icon: InstagramIcon },
    { label: 'Yol Tarifi', href: BUSINESS.maps, Icon: MapPin },
];

/*
 * Karşılama ekranı (masadaki QR okutulunca açılır). Gerçek HTML/CSS ile çizilir:
 * telefon çerçevesi ya da ekran görüntüsüne gömülü sahte durum çubuğu yoktur; telefonda tam ekran,
 * geniş ekranda ortada 430px'lik sütun olarak görünür.
 */
export const WelcomeScreen = ({ onOpenMenu, tableNumber, tableError }) => {
    // Açık/kapalı durumu saate göre canlı hesaplanır
    const [open, setOpen] = useState(() => isOpenNow());
    useEffect(() => {
        const timer = setInterval(() => setOpen(isOpenNow()), 30000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative min-h-[100dvh] max-w-[430px] mx-auto bg-[#141312] flex flex-col overflow-hidden select-none">
            {/* Üst kenardan akan sos damlaları */}
            <SauceDrips className="absolute top-0 inset-x-0 w-full h-[150px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center px-4 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2.5rem))]">
                <img
                    src="/images/unopia-logo-round.png"
                    alt="UNOPIA"
                    className="w-[132px] h-[132px] rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
                    draggable={false}
                />
                <p className="mt-5 text-[19px] text-[#F3EBDD] tracking-[0.01em]">Doğal malzemeler, taze hamur</p>

                {/* Masa: yalnızca masadaki QR koddan gelir */}
                {tableNumber && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E1C1A] border border-[#6E6B45]/70 text-[#A6A277] text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A6A277] animate-pulse" />
                        {tableNumber} · Hoş geldiniz
                    </div>
                )}
                {!tableNumber && tableError && (
                    <p role="alert" className="mt-3 w-full px-3 py-2 rounded-[14px] bg-[#1E1C1A] border border-[#7B1E2B]/80 text-[#F3EBDD] text-xs leading-snug text-center">
                        {tableError}
                    </p>
                )}

                <button
                    type="button"
                    onClick={onOpenMenu}
                    className="mt-6 w-full h-[56px] rounded-full bg-[#7B1E2B] hover:bg-[#9A2A38] active:bg-[#9A2A38] text-[#F3EBDD] text-[17px] font-semibold flex items-center justify-center gap-2 shadow-xl shadow-[#7B1E2B]/30 transition-colors cursor-pointer"
                >
                    Menüyü Gör
                    <ChevronRight className="w-5 h-5" />
                </button>

                <div className="mt-3.5 w-full grid grid-cols-2 gap-3">
                    {LINKS.map(({ label, href, Icon }) => (
                        <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-[92px] p-3.5 rounded-[16px] bg-[#1E1C1A] border border-[rgba(243,235,221,0.08)] hover:border-[rgba(243,235,221,0.18)] active:bg-[#252320] flex flex-col justify-between text-[#F3EBDD] transition-colors"
                        >
                            <Icon className="w-6 h-6" strokeWidth={1.75} />
                            <span className="flex items-center justify-between text-[13px] font-medium">
                                {label}
                                <ChevronRight className="w-4 h-4 text-[#B5AEA3]" />
                            </span>
                        </a>
                    ))}
                </div>

                {/* Açık/kapalı durumu, saatler ve çocuk oyun alanı */}
                <div className="mt-4 w-full flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 whitespace-nowrap" aria-live="polite">
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${open ? 'bg-[#6E6B45]' : 'bg-[#B5AEA3]/40'}`} />
                        <span className="text-sm font-medium text-[#F3EBDD]">{open ? 'Şu an açık' : 'Şu an kapalı'}</span>
                        <span className="w-px h-4 bg-[#F3EBDD]/25" />
                        <span className="text-xs text-[#B5AEA3] tabular-nums">
                            {BUSINESS.hours.open} – {BUSINESS.hours.close}
                        </span>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#6E6B45]/70 text-[#F3EBDD] text-xs font-medium">
                        <KidPlayIcon className="w-4 h-4" />
                        Çocuk oyun alanı
                    </span>
                </div>
            </div>

            {/* Alt kısım: pizza fotoğrafı, üst kenarı zemine yumuşakça karışır */}
            <div className="relative flex-1 min-h-[200px] mt-4">
                <img
                    src="/images/pizza-margherita.webp"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-[center_40%]"
                    draggable={false}
                />
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#141312] to-transparent" />
            </div>
        </div>
    );
};
