import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, RefreshCw, Flame, Check, HandPlatter } from 'lucide-react';
import { apiService, errorMessage } from '../../api';
import { getEcho } from '../../echo';
import { playDingSound } from '../common/Icons';

// Mutfak yalnızca garsonun onayladığı siparişleri görür (brif: sipariş garson onayından sonra mutfağa gider)
const STAGES = {
    approved: { label: 'Yeni', next: 'preparing', action: 'Hazırlamaya başla', icon: Flame },
    preparing: { label: 'Hazırlanıyor', next: 'ready', action: 'Hazır', icon: Check },
    ready: { label: 'Hazır', next: 'served', action: 'Servis edildi', icon: HandPlatter },
};

const minutesSince = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export const KitchenScreen = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;
    const knownIds = useRef(null);

    const fetchOrders = useCallback(async () => {
        try {
            const data = await apiService.getActiveKitchenOrders();
            // Yeni gelen siparişte (ilk yükleme hariç) sesli uyarı
            if (knownIds.current && soundRef.current && data.some((o) => !knownIds.current.has(o.id))) {
                playDingSound();
            }
            knownIds.current = new Set(data.map((o) => o.id));
            setOrders(data);
            setError(null);
        } catch (err) {
            if (err.response?.status !== 401) setError('Siparişler alınamadı. Bağlantıyı kontrol edin.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000); // WebSocket yoksa da güncel kalır

        let channel;
        try {
            channel = getEcho().channel('kitchen.1');
            channel.listen('.new.order', () => fetchOrders());
        } catch {
            // WebSocket sunucusu yoksa periyodik yenileme yeterli
        }

        return () => {
            clearInterval(interval);
            channel?.stopListening('.new.order');
        };
    }, [fetchOrders]);

    const advance = async (order) => {
        const stage = STAGES[order.status];
        if (!stage) return;
        setBusy(order.id);
        try {
            await apiService.updateOrderStatus(order.id, stage.next);
            setOrders((prev) =>
                stage.next === 'served'
                    ? prev.filter((o) => o.id !== order.id)
                    : prev.map((o) => (o.id === order.id ? { ...o, status: stage.next } : o))
            );
        } catch (err) {
            setError(errorMessage(err, 'Durum güncellenemedi.'));
            fetchOrders();
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-heading text-xl tracking-wide uppercase text-[#F3EBDD]">Mutfak</h2>
                    <p className="text-sm text-[#A6A277]">Garsonun onayladığı siparişler · {orders.length} açık</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="min-h-[44px] px-4 rounded-[12px] bg-[#171513] border border-[#6E6B45]/30 text-sm text-[#F3EBDD] flex items-center gap-2 cursor-pointer"
                    >
                        {soundEnabled ? <Volume2 className="w-4 h-4 text-[#A6A277]" /> : <VolumeX className="w-4 h-4 text-[#B5AEA3]" />}
                        {soundEnabled ? 'Ses açık' : 'Ses kapalı'}
                    </button>
                    <button
                        onClick={fetchOrders}
                        className="min-h-[44px] px-4 rounded-[12px] bg-[#171513] border border-[#6E6B45]/30 text-sm text-[#B5AEA3] hover:text-[#F3EBDD] flex items-center gap-2 cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </button>
                </div>
            </div>

            {error && (
                <div className="px-4 py-2.5 rounded-[12px] bg-[#171513] border border-[#F3EBDD]/15 text-sm text-[#F3EBDD]">{error}</div>
            )}

            {orders.length === 0 && !loading ? (
                <div className="text-center py-24 rounded-[14px] border border-[#6E6B45]/25 bg-[#171513]/50">
                    <h3 className="text-base font-semibold text-[#F3EBDD]">Bekleyen sipariş yok</h3>
                    <p className="text-sm text-[#B5AEA3] mt-1">Garson bir siparişi onayladığında burada görünür.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {orders.map((ord) => {
                        const stage = STAGES[ord.status] || STAGES.approved;
                        const Icon = stage.icon;
                        return (
                            <div
                                key={ord.id}
                                className={`rounded-[14px] bg-[#171513] flex flex-col overflow-hidden border ${
                                    ord.status === 'approved' ? 'border-[#F3EBDD]/35' : 'border-[#6E6B45]/25'
                                } ${ord.status === 'preparing' ? 'border-l-[3px] border-l-[#A6A277]' : ''}`}
                            >
                                <div className="px-4 py-3 border-b border-[#6E6B45]/30 flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-base font-semibold text-[#F3EBDD]">{ord.table_number}</div>
                                        <div className="text-xs text-[#B5AEA3]">
                                            #{ord.id} · {ord.source === 'QR' ? 'QR' : 'Garson'} · {minutesSince(ord.created_at)} dk
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-[8px] border border-[#F3EBDD]/15 text-[#F3EBDD]">
                                        {stage.label}
                                    </span>
                                </div>

                                <ul className="px-4 py-3 flex-1 space-y-2.5">
                                    {ord.items?.map((item) => (
                                        <li key={item.id}>
                                            <div className="text-[15px] font-semibold text-[#F3EBDD]">
                                                {item.quantity}× {item.product?.name}
                                                <span className="text-sm font-normal text-[#B5AEA3] ml-2">{item.size}</span>
                                            </div>
                                            {item.notes && (
                                                <div className="text-sm text-[#F3EBDD] mt-0.5 pl-2 border-l-2 border-[#A6A277]">{item.notes}</div>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                <div className="p-3 border-t border-[#6E6B45]/30">
                                    <button
                                        onClick={() => advance(ord)}
                                        disabled={busy === ord.id}
                                        className={`w-full min-h-[48px] rounded-[12px] text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                                            ord.status === 'ready'
                                                ? 'bg-[#201E1B] hover:bg-[#2B2824] border border-[#F3EBDD]/15 text-[#F3EBDD]'
                                                : 'bg-[#6E6B45] hover:bg-[#7d7a50] text-[#F3EBDD]'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {stage.action}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
