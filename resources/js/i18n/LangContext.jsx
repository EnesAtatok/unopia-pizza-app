import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { LANGUAGES, MESSAGES } from './messages';
import { setApiLocale } from '../api';
import { setPriceLocale } from '../productImage';

const STORAGE_KEY = 'unopia_lang';
const LangContext = createContext({ lang: 'tr', setLang: () => {}, t: (k) => k });

// Önce müşterinin daha önce seçtiği dil, yoksa telefonun dili, o da desteklenmiyorsa Türkçe
const detectLang = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (LANGUAGES[saved]) return saved;
    } catch {
        // depolama kapalı olabilir
    }
    const preferred = (navigator.languages || [navigator.language || '']).map((l) => l.slice(0, 2).toLowerCase());
    return preferred.find((l) => LANGUAGES[l]) || 'tr';
};

// API mesajları ve fiyat biçimi dil değişir değişmez (aynı render'da) güncellenir
const applyLang = (lang, enabled) => {
    if (!enabled) return;
    setApiLocale(lang);
    setPriceLocale(LANGUAGES[lang].locale);
    document.documentElement.lang = lang;
};

const lookup = (dict, key) => key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);

/**
 * QR menü dili. Yalnızca müşteri ekranında etkindir (enabled); panel her zaman Türkçe kalır
 * ve API isteklerine dil başlığı eklemez.
 */
export const LangProvider = ({ enabled, children }) => {
    const [lang, setLangState] = useState(() => {
        const initial = enabled ? detectLang() : 'tr';
        applyLang(initial, enabled);
        return initial;
    });

    const setLang = useCallback(
        (next) => {
            if (!LANGUAGES[next]) return;
            applyLang(next, enabled);
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch {
                // depolama kapalı olabilir
            }
            setLangState(next);
        },
        [enabled]
    );

    /** t('menu.search'), t('menu.noResults', { q }) — eksik anahtar Türkçeye, o da yoksa fallback'e düşer */
    const t = useCallback(
        (key, vars, fallback) => {
            let msg = lookup(MESSAGES[lang], key) ?? lookup(MESSAGES.tr, key);
            if (msg === undefined) return fallback ?? key;
            if (typeof msg === 'string' && vars) msg = msg.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
            return msg;
        },
        [lang]
    );

    const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
    return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
