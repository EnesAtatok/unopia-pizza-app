import React, { useState } from 'react';
import { LogOut, ChevronRight, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SauceDrips, FlowLines } from '../common/Icons';
import { PinSettingsModal } from './PinSettingsModal';
import { MAIN_TABS, EXTRA_TABS, ROLE_LABELS, visibleFor } from './tabs';

const NavButton = ({ tab, active, onClick, badge }) => {
    const Icon = tab.icon;
    return (
        <button
            onClick={onClick}
            className={`relative w-full min-h-[48px] flex items-center gap-3.5 px-4 rounded-[12px] text-[15px] transition-all cursor-pointer ${
                active
                    ? 'bg-gradient-to-r from-[#7B1E2B] to-[#5A1520] text-[#F3EBDD] font-semibold shadow-[0_8px_24px_rgba(123,30,43,0.35)] ring-1 ring-[#9A2A38]/50'
                    : 'text-[#D9D1C3] hover:bg-[#171513] hover:text-[#F3EBDD]'
            }`}
        >
            <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#F3EBDD]' : 'text-[#CFC7B8]'}`} strokeWidth={1.6} />
            <span className="flex-1 text-left">{tab.label}</span>
            {badge > 0 && (
                <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold flex items-center justify-center tabular-nums ${
                    active ? 'bg-[#F3EBDD] text-[#7B1E2B]' : 'bg-[#7B1E2B] text-[#F3EBDD]'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    );
};

export const PanelLayout = ({ activeTab, onChangeTab, pendingCount = 0, children }) => {
    const { user, logout, isManager } = useAuth();
    const [pinsOpen, setPinsOpen] = useState(false);
    const role = user?.role;
    // Garson hesabı ortak kullanılır: kişi adı değil yalnızca "Garson" gösterilir
    const displayName = role === 'garson' ? ROLE_LABELS.garson : user?.name || 'Personel';
    const showRoleLine = role !== 'garson';
    const mainTabs = MAIN_TABS.filter(visibleFor(role));
    const extraTabs = EXTRA_TABS.filter(visibleFor(role));
    // Telefonda alt çubuk: rolün görebildiği tüm sekmeler (kısa adlarıyla)
    const phoneTabs = [...mainTabs, ...extraTabs];

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
                            <span className="block text-[10px] tracking-[0.38em] text-[#A6A277]/80 mt-1.5">PERSONEL</span>
                        </div>
                    </div>

                    <nav className="space-y-1.5">
                        {mainTabs.map((tab) => (
                            <NavButton
                                key={tab.id}
                                tab={tab}
                                active={activeTab === tab.id}
                                onClick={() => onChangeTab(tab.id)}
                                badge={tab.id === 'tables' ? pendingCount : 0}
                            />
                        ))}
                    </nav>

                    {extraTabs.length > 0 && (
                        <nav className="space-y-1.5 pt-5 border-t border-[#6E6B45]/25">
                            {extraTabs.map((tab) => (
                                <NavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => onChangeTab(tab.id)} />
                            ))}
                        </nav>
                    )}
                </div>

                <div className="relative px-4 pb-5 pt-4 border-t border-[#6E6B45]/25 space-y-2.5">
                    {/* Oturum açan personel. Yönetici tıklayınca giriş şifrelerini değiştirir. */}
                    <button
                        type="button"
                        onClick={() => isManager && setPinsOpen(true)}
                        disabled={!isManager}
                        title={isManager ? 'Giriş şifreleri' : undefined}
                        className="w-full text-left flex items-center gap-2.5 px-2.5 py-3 rounded-[14px] bg-[#131210]/90 border border-[#6E6B45]/35 enabled:hover:border-[#A6A277]/55 enabled:cursor-pointer transition-colors"
                    >
                        <span className="w-10 h-10 rounded-full bg-[#6E6B45] text-[#F3EBDD] text-base font-semibold flex items-center justify-center shrink-0">
                            {displayName.trim().charAt(0).toLocaleUpperCase('tr-TR')}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="text-[13px] leading-snug text-[#F3EBDD] font-semibold break-words">{displayName}</div>
                            {showRoleLine && <div className="text-xs text-[#A6A277]">{ROLE_LABELS[role] || role}</div>}
                        </div>
                        {isManager && <KeyRound className="w-4 h-4 text-[#B5AEA3] shrink-0" />}
                        {isManager && <ChevronRight className="w-4 h-4 text-[#B5AEA3] shrink-0 -ml-1.5" />}
                    </button>
                    <button
                        onClick={logout}
                        className="w-full min-h-[44px] flex items-center gap-3.5 px-2 rounded-[10px] text-[15px] text-[#D9D1C3] hover:text-[#F3EBDD] transition-colors cursor-pointer"
                    >
                        <LogOut className="w-5 h-5" strokeWidth={1.6} />
                        <span>Çıkış yap</span>
                    </button>
                </div>
            </aside>

            {/* Telefon: üst çubuk */}
            <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[#090807] border-b border-[#7B1E2B]/50 shrink-0">
                <div className="flex items-center gap-2">
                    <img src="/images/unopia-logo-round.png" alt="" className="w-8 h-8 rounded-full" />
                    <span className="font-heading text-sm tracking-wider">UNOPIA</span>
                    <span className="text-xs text-[#A6A277] ml-1">{displayName}</span>
                </div>
                <div className="flex items-center">
                    {isManager && (
                        <button onClick={() => setPinsOpen(true)} aria-label="Giriş şifreleri" className="h-11 w-11 flex items-center justify-center text-[#B5AEA3] cursor-pointer">
                            <KeyRound className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={logout} className="h-11 px-3 flex items-center gap-2 text-sm text-[#B5AEA3] cursor-pointer">
                        <LogOut className="w-4 h-4" />
                        Çıkış
                    </button>
                </div>
            </header>

            <main className="relative flex-1 flex overflow-hidden min-h-0 bg-[radial-gradient(ellipse_70%_55%_at_75%_100%,rgba(123,30,43,0.16),transparent_65%),radial-gradient(ellipse_60%_50%_at_0%_0%,rgba(110,107,69,0.07),transparent_60%)]">{children}</main>

            {/* Telefon: alt sekme çubuğu (başparmak erişiminde) */}
            <nav className="md:hidden grid border-t border-[#6E6B45]/30 bg-[#090807] shrink-0 pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${phoneTabs.length}, 1fr)` }}>
                {phoneTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChangeTab(tab.id)}
                            className={`relative h-16 flex flex-col items-center justify-center gap-1 text-xs cursor-pointer ${
                                active ? 'text-[#F3EBDD] font-semibold' : 'text-[#B5AEA3]'
                            }`}
                        >
                            {active && <span className="absolute top-0 left-1/4 right-1/4 h-[3px] rounded-b-full bg-[#9A2A38]" />}
                            <Icon className={`w-5 h-5 ${active ? 'text-[#F3EBDD]' : ''}`} />
                            <span className="truncate max-w-full px-0.5">{tab.phoneLabel || tab.label}</span>
                            {tab.id === 'tables' && pendingCount > 0 && (
                                <span className="absolute top-2 left-[calc(50%+6px)] min-w-[20px] h-5 px-1 rounded-full bg-[#7B1E2B] text-[#F3EBDD] text-[11px] font-semibold flex items-center justify-center tabular-nums">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {pinsOpen && <PinSettingsModal onClose={() => setPinsOpen(false)} />}
        </div>
    );
};
