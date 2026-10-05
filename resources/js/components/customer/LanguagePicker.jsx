import React, { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useLang } from '../../i18n/LangContext';
import { LANGUAGES } from '../../i18n/messages';
import { Flag } from '../common/Flags';

// Giriş ekranındaki dil butonu: seçili dilin bayrağı; dokununca 4 bayraklı seçim paneli açılır.
// Diller kendi adlarıyla yazılır (Türkçe, English, Български, Ελληνικά) ki herkes kendi dilini tanısın.
export const LanguagePicker = () => {
    const { lang, setLang, t } = useLang();
    const [open, setOpen] = useState(false);

    const choose = (code) => {
        setLang(code);
        setOpen(false);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`${t('lang.current')}: ${LANGUAGES[lang].name}`}
                className="h-11 pl-2.5 pr-2 rounded-full bg-[#141312]/80 backdrop-blur-md border border-[#F3EBDD]/15 flex items-center gap-2 text-[#F3EBDD] text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
                <Flag lang={lang} />
                {lang}
                <ChevronDown className="w-4 h-4 text-[#B5AEA3]" />
            </button>

            {open && (
                <div className="fixed inset-0 z-[60] bg-[#141312]/80 backdrop-blur-sm flex flex-col justify-end max-w-[430px] mx-auto" onClick={() => setOpen(false)}>
                    <div
                        role="dialog"
                        aria-label={t('lang.choose')}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#141312] border-t border-[#F3EBDD]/10 rounded-t-[28px] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-heading text-lg tracking-wide text-[#F3EBDD] uppercase">{t('lang.choose')}</h2>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label={t('common.ok')}
                                className="w-11 h-11 rounded-full bg-[#1E1C1A] border border-[#F3EBDD]/10 flex items-center justify-center text-[#F3EBDD] cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(LANGUAGES).map(([code, { name }]) => {
                                const active = code === lang;
                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        lang={code}
                                        onClick={() => choose(code)}
                                        aria-pressed={active}
                                        className={`relative min-h-[96px] rounded-[16px] border flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-colors ${
                                            active ? 'bg-[#7B1E2B]/25 border-[#9A2A38]' : 'bg-[#1E1C1A] border-[#F3EBDD]/10 hover:border-[#6E6B45]'
                                        }`}
                                    >
                                        <Flag lang={code} className="w-14 h-[37px]" />
                                        <span className="text-sm font-semibold text-[#F3EBDD]">{name}</span>
                                        {active && <Check className="absolute top-2.5 right-2.5 w-4 h-4 text-[#F3EBDD]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
