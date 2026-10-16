import React from 'react';
import { UtensilsCrossed, QrCode } from 'lucide-react';
import { SauceDrips, FlowLines } from '../common/Icons';

// Yönetim paneli: tek rol, giriş yok. Menü yönetimi ve menü QR kodu.
const TABS = [
    { id: 'menu', label: 'Menü', icon: UtensilsCrossed },
    { id: 'qr', label: 'QR kod', icon: QrCode },
];

export const PanelLayout = ({ activeTab, onTabChange, children }) => {
    return (
        <div className="flex flex-col md:flex-row h-[100dvh] w-screen bg-[#0D0C0B] text-[#F3EBDD] font-sans antialiased overflow-hidden select-none">
            {/* Tablet: sol menü */}
            <aside className="relative hidden md:flex w-60 bg-[#090807] border-r border-[#6E6B45]/25 flex-col justify-between shrink-0 overflow-hidden">
                {/* Sol üst köşe: bordo duman ve hafif sos damlaları */}
                <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(123,30,43,0.45),transparent_65%)] pointer-events-none" aria-hidden="true" />
                <SauceDrips className="absolute top-0 left-0 w-full h-[60px] opacity-40 pointer-events-none" />
                {/* Sol alt köşe: haki akış çizgileri */}
                <FlowLines tone="khaki" className="absolute bottom-0 left-0 w-full h-40 pointer-events-none" />
                <div className="absolute -bottom-20 -left-16 w-64 h-56 rounded-full bg-[radial-gradient(circle,rgba(110,107,69,0.22),transparent_65%)] pointer-events-none" aria-hidden="true" />

                <div className="relative px-4 pt-8 space-y-7">
                    {/* Logo */}
                    <div className="flex items-center gap-3.5 px-1">
                        <img src="/images/unopia-logo-round.png" alt="" className="w-12 h-12 rounded-full shrink-0 ring-2 ring-[#6E6B45]/50 shadow-[0_8px_24px_rgba(0,0,0,0.6)]" />
                        <div className="leading-none">
                            <span className="block text-xl font-medium tracking-[0.16em] text-[#F3EBDD]">UNOPIA</span>
                            <span className="block text-[10px] tracking-[0.38em] text-[#A6A277]/80 mt-1.5">YÖNETİM</span>
                        </div>
                    </div>

                    <nav className="space-y-1.5">
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const isActive = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => onTabChange(id)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`relative w-full min-h-[48px] flex items-center gap-3.5 px-4 rounded-[12px] text-[15px] transition-colors cursor-pointer ${
                                        isActive
                                            ? 'bg-gradient-to-r from-[#7B1E2B] to-[#5A1520] text-[#F3EBDD] font-semibold shadow-[0_8px_24px_rgba(123,30,43,0.35)] ring-1 ring-[#9A2A38]/50'
                                            : 'text-[#D9D1C3] hover:text-[#F3EBDD] hover:bg-[#131210]'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 shrink-0" strokeWidth={1.6} />
                                    <span className="flex-1 text-left">{label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Telefon: üst çubuk ve sekmeler */}
            <header className="md:hidden flex items-center justify-between gap-2 px-4 h-14 bg-[#090807] border-b border-[#7B1E2B]/50 shrink-0">
                <div className="flex items-center gap-2">
                    <img src="/images/unopia-logo-round.png" alt="" className="w-8 h-8 rounded-full" />
                    <span className="font-heading text-sm tracking-wider">UNOPIA</span>
                </div>
                <nav className="flex items-center gap-1">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onTabChange(id)}
                            aria-current={activeTab === id ? 'page' : undefined}
                            className={`h-10 px-3 rounded-full flex items-center gap-1.5 text-sm cursor-pointer ${
                                activeTab === id ? 'bg-[#7B1E2B] text-[#F3EBDD] font-semibold' : 'text-[#B5AEA3]'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="relative flex-1 flex overflow-hidden min-h-0 bg-[radial-gradient(ellipse_70%_55%_at_75%_100%,rgba(123,30,43,0.16),transparent_65%),radial-gradient(ellipse_60%_50%_at_0%_0%,rgba(110,107,69,0.07),transparent_60%)]">{children}</main>
        </div>
    );
};
