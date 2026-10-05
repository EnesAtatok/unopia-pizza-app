import React, { useId } from 'react';

// Dil seçici bayrakları (saf SVG: emoji bayraklar Windows'ta harf olarak görünür). Oran 3:2.

const TurkeyFlag = () => {
    // Yıldız: 5 köşe, bir ucu hilale (sola) bakar
    const cx = 583, cy = 400, R = 100, r = 38;
    const pts = Array.from({ length: 10 }, (_, i) => {
        const a = Math.PI + (i * Math.PI) / 5;
        const rad = i % 2 ? r : R;
        return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return (
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
            <rect width="1200" height="800" fill="#E30A17" />
            <circle cx="425" cy="400" r="200" fill="#fff" />
            <circle cx="475" cy="400" r="160" fill="#E30A17" />
            <polygon points={pts} fill="#fff" />
        </svg>
    );
};

const UkFlag = () => {
    const id = useId().replace(/:/g, '');
    return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
            <clipPath id={`s${id}`}>
                <path d="M0,0 v30 h60 v-30 z" />
            </clipPath>
            <clipPath id={`t${id}`}>
                <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
            </clipPath>
            <g clipPath={`url(#s${id})`}>
                <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#t${id})`} stroke="#C8102E" strokeWidth="4" />
                <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
            </g>
        </svg>
    );
};

const BulgariaFlag = () => (
    <svg viewBox="0 0 5 3" preserveAspectRatio="none" className="w-full h-full">
        <rect width="5" height="1" fill="#fff" />
        <rect y="1" width="5" height="1" fill="#00966E" />
        <rect y="2" width="5" height="1" fill="#D62612" />
    </svg>
);

const GreeceFlag = () => (
    <svg viewBox="0 0 27 18" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <rect width="27" height="18" fill="#0D5EAF" />
        {[2, 6, 10, 14].map((y) => (
            <rect key={y} y={y} width="27" height="2" fill="#fff" />
        ))}
        <rect width="10" height="10" fill="#0D5EAF" />
        <rect y="4" width="10" height="2" fill="#fff" />
        <rect x="4" width="2" height="10" fill="#fff" />
    </svg>
);

const FLAGS = { tr: TurkeyFlag, en: UkFlag, bg: BulgariaFlag, el: GreeceFlag };

export const Flag = ({ lang, className = 'w-7 h-[18px]' }) => {
    const F = FLAGS[lang];
    return (
        <span className={`inline-block shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/25 ${className}`} aria-hidden="true">
            {F && <F />}
        </span>
    );
};
