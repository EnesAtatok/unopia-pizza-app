// İşletme bilgileri. Brif: çalışma saatleri, kapanış saati ve WhatsApp numarası işletmeden gelecek;
// buradaki değerler yer tutucudur, gerçekleri gelince yalnızca bu dosya güncellenir.
export const BUSINESS = {
    name: 'Unopia Pizza Edirne',
    hours: { open: '11:00', close: '23:00' }, // YER TUTUCU — haftanın her günü aynı
    whatsapp: '905071005605', // +90 507 100 56 05 (wa.me biçimi: ülke kodu + numara, boşluksuz)
    instagram: 'https://instagram.com/unopiapizza',
    googleReviews: 'https://www.google.com/search?q=Unopia+Pizza+Edirne#lrd=0x0:0x0,3,,,',
    maps: 'https://www.google.com/maps/search/?api=1&query=Unopia+Pizza+%C5%9E%C3%BCkr%C3%BCpa%C5%9Fa+Edirne',
};

const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

/** Şu an açık mı? Gece yarısını geçen kapanışları da (ör. 11:00–01:00) destekler. */
export const isOpenNow = (now = new Date()) => {
    const minutes = now.getHours() * 60 + now.getMinutes();
    const open = toMinutes(BUSINESS.hours.open);
    const close = toMinutes(BUSINESS.hours.close);
    return close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;
};
