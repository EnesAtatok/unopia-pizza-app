import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLang } from '../../i18n/LangContext';

/*
 * Açılış videosu (public/videos/intro.mp4, 16:9, ~10 sn; 2x hızda ~5 sn). Müşteri ilk girdiğinde oynar, bitince
 * karşılama ekranı açılır; aynı oturumda yalnızca bir kez gösterilir (app.jsx).
 * - Video ekrana TAM sığar, hiçbir yeri kırpılmaz (telefonda ekran genişliğinde, dikeyde ortada).
 *   Üst/alt boşluğu aynı videonun bulanık kopyası doldurur; video kenarları ona yumuşakça karışır.
 * - Tarayıcılar sesli otomatik oynatmaya izin vermediği için sessiz başlar; sağ üstten ses açılabilir.
 * - Ekrana dokununca geçilir. Video oynatılamazsa (hata, düşük güç modu, yavaş bağlantı) beklemeden geçilir.
 */
const VIDEO_SRC = '/videos/intro.mp4';
const POSTER_SRC = '/videos/intro-poster.jpg';
const PLAYBACK_RATE = 2; // video 2x hızda oynar (~5 sn): aç müşteri menüye çabuk ulaşsın
const START_TIMEOUT_MS = 2500; // bu sürede oynamaya başlamazsa karşılama ekranına geçilir
const EDGE_FADE = 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)';

export const OpeningAnimation = ({ onComplete }) => {
    const { t } = useLang();
    const videoRef = useRef(null);
    const bgRef = useRef(null);
    const doneRef = useRef(false);
    const [leaving, setLeaving] = useState(false);
    const [muted, setMuted] = useState(true);

    const finish = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        videoRef.current?.pause();
        bgRef.current?.pause();
        setLeaving(true);
        setTimeout(onComplete, 350);
    };

    useEffect(() => {
        const video = videoRef.current;
        // Hareketi azalt açıksa video oynatılmaz
        if (!video || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            finish();
            return;
        }

        // Hız yeni kaynak yüklenince sıfırlanmasın diye varsayılan hız da ayarlanır
        for (const v of [video, bgRef.current]) {
            if (v) v.defaultPlaybackRate = v.playbackRate = PLAYBACK_RATE;
        }

        let started = false;
        const onPlaying = () => {
            started = true;
            bgRef.current?.play().catch(() => {});
        };
        // Bulanık arka plan ana videoyla aynı karede kalsın
        const sync = () => {
            const bg = bgRef.current;
            if (bg && Math.abs(bg.currentTime - video.currentTime) > 0.3) bg.currentTime = video.currentTime;
        };
        video.addEventListener('playing', onPlaying);
        video.addEventListener('timeupdate', sync);
        video.play().catch(finish); // otomatik oynatma engellendiyse geç

        const startTimer = setTimeout(() => !started && finish(), START_TIMEOUT_MS);
        return () => {
            clearTimeout(startTimer);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('timeupdate', sync);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleSound = (e) => {
        e.stopPropagation(); // ses düğmesi videoyu geçmesin
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setMuted(video.muted);
    };

    return (
        <div
            onClick={finish}
            role="button"
            aria-label={t('anim.skip')}
            className={`fixed inset-0 z-[60] bg-[#0C0B0A] cursor-pointer select-none overflow-hidden transition-opacity duration-300 ${
                leaving ? 'opacity-0' : 'opacity-100'
            }`}
        >
            {/* Arka plan: aynı videonun bulanık, koyulaştırılmış kopyası (üst/alt boşluğu doldurur) */}
            <video
                ref={bgRef}
                src={VIDEO_SRC}
                poster={POSTER_SRC}
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl brightness-[.45] pointer-events-none"
            />

            {/* Video: kırpılmadan ekrana tam sığar (16:9 kutu, ekranın ortasında); üst/alt kenarı arka plana karışır */}
            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-video pointer-events-none"
                style={{ width: 'min(100vw, calc(100dvh * 16 / 9))', maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE }}
            >
                <video
                    ref={videoRef}
                    src={VIDEO_SRC}
                    poster={POSTER_SRC}
                    muted
                    playsInline
                    preload="auto"
                    onEnded={finish}
                    onError={finish}
                    className="w-full h-full object-cover"
                />
            </div>

            <button
                type="button"
                onClick={toggleSound}
                aria-label={muted ? t('anim.unmute') : t('anim.mute')}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 w-11 h-11 rounded-full bg-[#141312]/70 backdrop-blur-md border border-[#F3EBDD]/15 text-[#F3EBDD] flex items-center justify-center cursor-pointer"
            >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] inset-x-0 text-center text-xs text-[#F3EBDD]/55 tracking-wider pointer-events-none">
                {t('anim.tapToSkip')}
            </div>
        </div>
    );
};
