import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Delete } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SauceDrips } from '../common/Icons';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'del'];

// Panel girişi: 4 haneli şifre. Şifre hangi personele aitse (yönetici / garson) o rolle girilir.
export const LoginModal = ({ onSuccess }) => {
    const { login, loading } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(null);

    const submit = useCallback(
        async (value) => {
            setError(null);
            const res = await login(value);
            if (res.success) {
                onSuccess(res.user);
            } else {
                setError(res.message);
                setPin('');
            }
        },
        [login, onSuccess]
    );

    const press = useCallback(
        (key) => {
            if (loading) return;
            if (key === 'del') {
                setPin((p) => p.slice(0, -1));
                return;
            }
            if (pin.length >= PIN_LENGTH) return;
            setError(null);
            const next = pin + key;
            setPin(next);
            // 4. hane girilince otomatik giriş
            if (next.length === PIN_LENGTH) submit(next);
        },
        [loading, pin, submit]
    );

    // Fiziksel klavye: rakamlar ve geri silme
    useEffect(() => {
        const onKey = (e) => {
            if (/^\d$/.test(e.key)) press(e.key);
            else if (e.key === 'Backspace') press('del');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [press]);

    return (
        <div className="fixed inset-0 z-50 bg-[#090807] flex items-center justify-center p-4 overflow-hidden">
            {/* Üst kenardan akan sos damlaları (müşteri ekranıyla aynı motif) */}
            {/* Geniş ekranda büyümesin: doğal boyutunda yan yana döşenir */}
            <div className="absolute top-0 inset-x-0 h-[120px] flex justify-center overflow-hidden pointer-events-none" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                    <SauceDrips key={i} className={`w-[430px] h-[120px] shrink-0 ${i % 2 ? '-scale-x-100' : ''}`} />
                ))}
            </div>
            <div className="bg-[#171513] border border-[#6E6B45]/30 rounded-[20px] max-w-sm w-full p-7 relative shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
                <div className="text-center mb-6">
                    <img src="/images/unopia-logo-round.png" alt="UNOPIA" className="w-16 h-16 rounded-full mx-auto mb-3 shadow-[0_8px_24px_rgba(0,0,0,0.6)]" />
                    <h2 className="font-heading text-xl tracking-wide uppercase text-[#F3EBDD]">Personel Girişi</h2>
                    <p className="text-xs text-[#B5AEA3] mt-1">Unopia Pizza Yönetim & POS Paneli</p>
                </div>

                <p className="text-sm text-center text-[#D9D1C3] mb-4">Şifrenizi girin</p>

                {/* Girilen hane göstergesi */}
                <div className="flex justify-center gap-4 mb-5" aria-live="polite" aria-label={`${pin.length} hane girildi`}>
                    {Array.from({ length: PIN_LENGTH }, (_, i) => (
                        <span
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 transition-colors ${
                                i < pin.length ? 'bg-[#A6A277] border-[#A6A277]' : error ? 'border-[#9A2A38]' : 'border-[#6E6B45]/60'
                            }`}
                        />
                    ))}
                </div>

                <div className="min-h-[44px] mb-3">
                    {error && (
                        <div className="p-2.5 bg-[#0D0C0B] border border-[#9A2A38]/60 rounded-[12px] flex items-center gap-2.5 text-sm text-[#F3EBDD]">
                            <AlertCircle className="w-4 h-4 text-[#C23A4B] shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Tuş takımı */}
                <div className="grid grid-cols-3 gap-2.5">
                    {KEYS.map((key, i) =>
                        key === null ? (
                            <span key={i} />
                        ) : (
                            <button
                                key={i}
                                type="button"
                                onClick={() => press(key)}
                                disabled={loading}
                                aria-label={key === 'del' ? 'Sil' : key}
                                className={`h-16 rounded-[14px] text-2xl font-medium tabular-nums flex items-center justify-center cursor-pointer transition-colors active:scale-[0.97] disabled:opacity-50 ${
                                    key === 'del'
                                        ? 'text-[#B5AEA3] hover:text-[#F3EBDD] hover:bg-[#0D0C0B]'
                                        : 'bg-[#0D0C0B] border border-[#6E6B45]/30 hover:border-[#A6A277]/60 text-[#F3EBDD]'
                                }`}
                            >
                                {key === 'del' ? <Delete className="w-6 h-6" /> : key}
                            </button>
                        )
                    )}
                </div>

                {loading && (
                    <div className="mt-4 flex justify-center">
                        <div className="w-5 h-5 border-2 border-[#F3EBDD] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
};
