import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echoInstance = null;

export const getEcho = () => {
    if (!echoInstance) {
        const host = window.location.hostname || 'localhost';
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY || 'unopia-key',
            wsHost: import.meta.env.VITE_REVERB_HOST || host,
            wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            forceTLS: false,
            enabledTransports: ['ws', 'wss'],
        });
        window.Echo = echoInstance;
    }
    return echoInstance;
};

export default getEcho;
