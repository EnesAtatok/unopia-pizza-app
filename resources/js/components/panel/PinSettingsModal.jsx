import React, { useState } from 'react';
import { X, KeyRound, Check } from 'lucide-react';
import { apiService, errorMessage } from '../../api';

const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 4);

const PinField = ({ label, value, onChange }) => (
    <label className="block">
        <span className="block text-sm text-[#D9D1C3] mb-1.5">{label}</span>
        <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            value={value}
            onChange={(e) => onChange(onlyDigits(e.target.value))}
            placeholder="••••"
            className="w-full h-12 px-4 bg-[#0D0C0B] border border-[#6E6B45]/35 rounded-[12px] text-lg tracking-[0.5em] text-[#F3EBDD] placeholder-[#B5AEA3]/40 focus:outline-none focus:border-[#A6A277]/70 tabular-nums"
        />
    </label>
);

// Yönetici: panel giriş şifrelerini değiştirir. Boş bırakılan şifre değişmez.
export const PinSettingsModal = ({ onClose }) => {
    const [managerPin, setManagerPin] = useState('');
    const [waiterPin, setWaiterPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(null);

    const invalid = [managerPin, waiterPin].some((p) => p !== '' && p.length !== 4);
    const empty = managerPin === '' && waiterPin === '';

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        setDone(null);
        if (invalid) return setError('Şifre 4 haneli olmalıdır.');
        if (managerPin && managerPin === waiterPin) return setError('Yönetici ve garson şifreleri farklı olmalıdır.');
        setBusy(true);
        try {
            const res = await apiService.updatePins({ managerPin, waiterPin });
            setDone(res.message || 'Şifreler güncellendi.');
            setManagerPin('');
            setWaiterPin('');
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : errorMessage(err, 'Şifreler güncellenemedi.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0D0C0B]/80 flex items-center justify-center p-4" onClick={onClose}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="relative overflow-hidden w-full max-w-sm bg-gradient-to-b from-[#1A1815] to-[#121110] border border-[#6E6B45]/35 rounded-[16px] p-5 space-y-4 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
            >
                <span className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#7B1E2B]" aria-hidden="true" />
                <div className="flex items-start justify-between gap-3 pl-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-[#0F0E0D] border border-[#6E6B45]/40 flex items-center justify-center shrink-0">
                            <KeyRound className="w-5 h-5 text-[#A6A277]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[#F3EBDD]">Giriş şifreleri</h3>
                            <p className="text-xs text-[#B5AEA3]">Değiştirmek istemediğiniz şifreyi boş bırakın.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Kapat" className="p-1.5 text-[#B5AEA3] hover:text-[#F3EBDD] cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3 pl-1">
                    <PinField label="Yeni yönetici şifresi" value={managerPin} onChange={setManagerPin} />
                    <PinField label="Yeni garson şifresi" value={waiterPin} onChange={setWaiterPin} />
                </div>

                {error && <div className="ml-1 px-3 py-2.5 rounded-[12px] bg-[#0D0C0B] border border-[#9A2A38]/60 text-sm text-[#F3EBDD]">{error}</div>}
                {done && (
                    <div className="ml-1 px-3 py-2.5 rounded-[12px] bg-[#0D0C0B] border border-[#A6A277]/50 text-sm text-[#F3EBDD] flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#A6A277]" />
                        {done}
                    </div>
                )}

                <div className="flex gap-2 pl-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 min-h-[46px] rounded-[12px] bg-[#0F0E0D] border border-[#6E6B45]/35 hover:border-[#A6A277]/55 text-sm text-[#F3EBDD] cursor-pointer"
                    >
                        Kapat
                    </button>
                    <button
                        type="submit"
                        disabled={busy || empty}
                        className="flex-1 min-h-[46px] rounded-[12px] bg-gradient-to-r from-[#7B1E2B] to-[#5A1520] hover:from-[#9A2A38] hover:to-[#7B1E2B] ring-1 ring-[#9A2A38]/50 text-sm font-semibold text-[#F3EBDD] cursor-pointer disabled:opacity-50"
                    >
                        {busy ? 'Kaydediliyor' : 'Kaydet'}
                    </button>
                </div>
            </form>
        </div>
    );
};
