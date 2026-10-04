import React from 'react';

const GlutenIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M8 5a4 4 0 0 1 8 0c0 3-4 6-4 6s-4-3-4-6ZM6 11a4 4 0 0 1 8 0c0 3-4 5-4 5s-4-2-4-5ZM10 17a3 3 0 0 1 6 0c0 2-3 3-3 3s-3-1-3-3Z" />
    </svg>
);

const MilkIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2h8v3H8zM6 8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM9 13h6" />
    </svg>
);

const EggIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c4.97 0 9-3.8 9-8.5C21 8.36 16.5 2 12 2S3 8.36 3 13.5c0 4.7 4.03 8.5 9 8.5z" />
    </svg>
);

const NutIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 10h14a7 7 0 0 1-14 0Z" />
        <path d="M4 10c0-3 3.6-5 8-5s8 2 8 5M12 5V3" />
    </svg>
);

/** Alerjen adına göre ince çizgi ikon (yoksa null) */
export const AllergenIcon = ({ name, className }) => {
    if (name === 'Gluten') return <GlutenIcon className={className} />;
    if (name === 'Süt') return <MilkIcon className={className} />;
    if (name === 'Yumurta') return <EggIcon className={className} />;
    if (['Fındık', 'Ceviz', 'Fıstık', 'Kuruyemiş'].includes(name)) return <NutIcon className={className} />;
    return null;
};

export const VegetarianLeafIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
);

export const InstagramIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
);

export const WhatsAppIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path
            d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M8.6 9.2c.2-.5.5-.5.8-.5h.6c.2 0 .4.1.5.4.3.6.8 2 .9 2.1.1.2.1.3 0 .5l-.4.5c-.1.1-.2.2-.1.4.3.5.7 1.2 1.3 1.7.6.5 1.2.8 1.7.8.2 0 .3-.1.4-.3l.5-.6c.2-.2.3-.2.5-.1.2.1 1.4.7 1.6.8.2.1.3.2.3.4 0 .6-.3 1.5-1.3 1.8-.7.2-1.5 0-2.8-.7-1.7-.8-3-2.2-3.8-3.8-.7-1.3-.9-2.1-.7-2.8.2-.9.8-1.3 1.2-1.3z"
            fill="currentColor"
        />
    </svg>
);

export const KidPlayIcon = ({ className = "w-4 h-4" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="4" r="2.2" />
        <path d="M15.5 9.5c-.4-.4-1-.6-1.5-.6H10c-.5 0-1.1.2-1.5.6L6 12l1.2 1.4 2.3-2.1V16l-2 3.5 1.7 1 2-3.5h1.6l2 3.5 1.7-1-2-3.5v-4.7l2.3 2.1L20 12l-2.5-2.5h-2z" />
        <circle cx="6" cy="19.5" r="1.2" />
        <circle cx="18" cy="19.5" r="1.2" />
    </svg>
);

// Ürün detay görselinin alt kenarından sarkan ince sos damlaları (mockup-product.jpg'deki gibi)
// [x, genişlik, uzunluk] — viewBox 430 genişliğinde
const HERO_DRIPS = [
    [8, 5, 20], [22, 7, 34], [41, 4, 16], [63, 6, 28], [88, 4, 14], [112, 8, 40],
    [139, 4, 18], [176, 5, 22], [214, 4, 12], [246, 6, 26], [281, 4, 15], [318, 7, 32],
    [347, 4, 18], [369, 6, 46], [392, 4, 20], [414, 6, 30],
];

export const HeroDrips = ({ className = "" }) => (
    <svg className={`w-full ${className}`} viewBox="0 0 430 56" preserveAspectRatio="none" fill="none" aria-hidden="true">
        {/* Görselin kenarındaki düzensiz sos şeridi */}
        <path
            d="M0 0H430V7C420 9 410 5 398 8C384 11 372 6 358 9C340 12 326 5 308 8C290 11 272 6 254 9C236 12 218 6 200 8C182 10 164 5 146 9C128 12 110 6 92 8C74 10 56 5 38 9C24 11 12 6 0 9V0Z"
            fill="#7B1E2B"
        />
        {HERO_DRIPS.map(([x, w, len]) => (
            <g key={x} fill="#7B1E2B" opacity={len > 30 ? 0.95 : 0.85}>
                <rect x={x - w / 2} y={4} width={w} height={len} rx={w / 2} />
                <circle cx={x} cy={4 + len} r={w * 0.62} />
            </g>
        ))}
    </svg>
);

// Üst kenardan akan sos damlaları (karşılama ekranı ve menü başlığı). Saf SVG: ekran görüntüsüne
// gömülü sahte durum çubuğu (saat, çentik, pil) yok; her genişlikte keskin çizilir.
// [x, üst genişlik, uzunluk] — viewBox 430x170
const SAUCE_DRIPS = [
    [10, 14, 62], [34, 9, 104], [52, 7, 40], [78, 12, 132], [104, 6, 52], [128, 10, 86],
    [300, 9, 70], [322, 13, 146], [344, 7, 58], [366, 11, 112], [388, 6, 44], [404, 12, 128], [424, 8, 74],
];
const SAUCE_SPECKS = [[22, 118, 2.2], [92, 150, 1.6], [140, 104, 1.4], [312, 98, 1.8], [356, 160, 2], [396, 150, 1.4], [60, 84, 1.2]];

const dripPath = (x, w, len) => {
    const r = w * 0.48; // damla ucu biraz şişkin
    const neck = w * 0.24;
    return `M${x - w / 2} 0 C${x - w / 2} ${len * 0.45} ${x - neck} ${len * 0.6} ${x - neck} ${len - r * 0.6}`
        + ` A${r} ${r} 0 1 0 ${x + neck} ${len - r * 0.6}`
        + ` C${x + neck} ${len * 0.6} ${x + w / 2} ${len * 0.45} ${x + w / 2} 0 Z`;
};

export const SauceDrips = ({ className = "" }) => (
    <svg className={className} viewBox="0 0 430 170" preserveAspectRatio="xMidYMin slice" fill="none" aria-hidden="true">
        <defs>
            <linearGradient id="sauceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4A0F17" />
                <stop offset="45%" stopColor="#7B1E2B" />
                <stop offset="100%" stopColor="#9A2A38" />
            </linearGradient>
        </defs>
        <g fill="url(#sauceGrad)">
            {/* Kenardaki düzensiz sos şeridi: köşelerde kalın, ortada incelir */}
            <path d="M0 0H430V34C418 40 404 30 392 38C378 46 362 28 346 34C330 40 314 22 298 26C270 30 246 10 215 12C184 14 160 30 132 26C116 24 100 40 84 34C68 28 52 44 36 38C22 33 10 42 0 36Z" />
            {SAUCE_DRIPS.map(([x, w, len]) => (
                <path key={x} d={dripPath(x, w, len)} />
            ))}
        </g>
        <g fill="#7B1E2B">
            {SAUCE_SPECKS.map(([x, y, r]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity="0.8" />
            ))}
        </g>
    </svg>
);

// Panel masa kartı ikonu: masa ve iki yanında sandalye
export const DiningTableIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9h12" />
        <path d="M8 9v8M16 9v8" />
        <path d="M3 7v10M3 13h3" />
        <path d="M21 7v10M21 13h-3" />
        <path d="M10 12h4" />
    </svg>
);

// Panelin köşelerindeki ince akış çizgileri (dekoratif). tone: 'khaki' | 'bordo' | 'mix'
export const FlowLines = ({ className = "", tone = 'mix' }) => {
    const colors = tone === 'khaki' ? ['#A6A277', '#6E6B45'] : tone === 'bordo' ? ['#9A2A38', '#7B1E2B'] : ['#9A2A38', '#A6A277'];
    return (
        <svg className={className} viewBox="0 0 400 160" preserveAspectRatio="none" fill="none" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
                <path
                    key={i}
                    d={`M0 ${120 - i * 6} C 90 ${60 - i * 4}, 170 ${150 - i * 5}, 260 ${92 - i * 5} S 360 ${40 + i * 3}, 400 ${30 + i * 4}`}
                    stroke={colors[i % 2]}
                    strokeWidth="0.8"
                    opacity={0.12 + (i % 3) * 0.06}
                />
            ))}
        </svg>
    );
};

export const playDingSound = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
    } catch {
        // Audio might be blocked before first user interaction
    }
};
