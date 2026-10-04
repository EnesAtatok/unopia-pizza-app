import { useEffect, useRef } from 'react';

// Müşteri ekranındaki katmanlar (menü, ürün detayı, sepet...) için telefonun geri tuşu:
// en üstteki katmanı kapatır, uygulamadan çıkmaz.
//
// Geçmişte yalnızca tek bir "koruma" kaydı tutulur ve uygulama kendisi asla history.back()
// çağırmaz (tarayıcıda gecikmeli çalıştığı için art arda açılıp kapanan katmanlarda sayım
// kayar ve sayfa uygulamanın dışına gidebilir).
const stack = [];
const GUARD = { unopiaGuard: true };
const guardIsCurrent = () => window.history.state?.unopiaGuard === true;

window.addEventListener('popstate', () => {
    // İleri tuşuyla koruma kaydına dönüldü: bir şey yapma
    if (guardIsCurrent()) return;
    // Geri tuşu koruma kaydını tüketti; şimdi koruma kaydının altındaki kayıttayız
    const top = stack[stack.length - 1];
    if (!top) {
        // Açık katman yok: katmanlar uygulama içinden kapatılmış, koruma kaydı geride kalmış.
        // Kullanıcı gerçekten geri gitmek istiyor: normal geri davranışını sürdür.
        window.history.back();
        return;
    }
    top.close();
    // Kapanan katmanın altında hâlâ katman varsa bir sonraki geri tuşu için korumayı yeniden kur
    if (stack.length > 1) window.history.pushState(GUARD, '');
});

/** open=true iken geri tuşu close() çağırır. */
export const useHistoryLayer = (open, close) => {
    const closeRef = useRef(close);
    closeRef.current = close;

    useEffect(() => {
        if (!open) return undefined;
        const layer = { close: () => closeRef.current() };
        stack.push(layer);
        if (!guardIsCurrent()) window.history.pushState(GUARD, '');

        return () => {
            const i = stack.indexOf(layer);
            if (i > -1) stack.splice(i, 1);
        };
    }, [open]);
};
