// Ürün görseli: veritabanındaki `image` alanı; yoksa null (fotoğrafsız ürün kartı kendi düzeniyle gösterilir).
// Uygulamayla gelen fotoğrafların sıkıştırılmış WebP kopyaları vardır: tam boy (ürün detayı) ve
// 320 px önizleme (menü kartı). Yöneticinin yüklediği fotoğraflara dokunulmaz.
const OPTIMIZED = /^\/images\/((?:pizza|salad|drink)-[a-z-]+)\.jpg$/;

/** variant: 'full' (ürün detayı) | 'thumb' (menü kartı) */
export const getProductImage = (product, variant = 'full') => {
    const src = product.image || null;
    const m = src?.match(OPTIMIZED);
    return m ? `/images/${m[1]}${variant === 'thumb' ? '-thumb' : ''}.webp` : src;
};

/** Adete göre fiyatlanan ürün mü (atıştırmalık: 4'lü / 6'lı) */
export const isPiecePricing = (product) =>
    !!product.piece_counts && typeof product.piece_counts === 'object' && Object.values(product.piece_counts).some(Boolean);

/**
 * Ürünün kullanılabilir boyları ve fiyatları (yalnızca tanımlı olanlar).
 * label seçim anahtarıdır (Küçük / Orta / Büyük); adetli üründe count da gelir (4, 6...).
 */
export const getSizeOptions = (product) => {
    const sizes = product.sizes && typeof product.sizes === 'object' ? product.sizes : {};
    const counts = isPiecePricing(product) ? product.piece_counts : {};
    return [
        { label: 'Küçük', key: 'small' },
        { label: 'Orta', key: 'medium' },
        { label: 'Büyük', key: 'large' },
    ]
        .filter((sz) => sizes[sz.key])
        .map((sz) => ({ label: sz.label, key: sz.key, price: Number(sizes[sz.key]), count: counts[sz.key] ? Number(counts[sz.key]) : null }));
};

/** Varsayılan: adetli üründe ilk seçenek; boyda Orta varsa Orta, yoksa ilk boy, hiç yoksa "Orta" (taban fiyat) */
export const getDefaultSize = (product) => {
    const options = getSizeOptions(product);
    if (isPiecePricing(product)) return options[0]?.label || 'Orta';
    return options.find((o) => o.label === 'Orta')?.label || options[0]?.label || 'Orta';
};

// Türkçe adet eki ünlü uyumuyla: 4'lü, 6'lı, 9'lu, 10'lu, 12'li, 100'lü
const TR_DIGIT_SUFFIX = { 1: 'li', 2: 'li', 3: 'lü', 4: 'lü', 5: 'li', 6: 'lı', 7: 'li', 8: 'li', 9: 'lu' };
const TR_TENS_SUFFIX = { 1: 'lu', 2: 'li', 3: 'lu', 4: 'lı', 5: 'li', 6: 'lı', 7: 'li', 8: 'li', 9: 'lı' };
export const trPieceLabel = (n) => {
    const num = Math.floor(Number(n));
    let suffix = 'li'; // bin
    if (num % 10) suffix = TR_DIGIT_SUFFIX[num % 10];
    else if (num % 100) suffix = TR_TENS_SUFFIX[(num % 100) / 10];
    else if (num % 1000) suffix = 'lü'; // yüz
    return `${num}'${suffix}`;
};

// İlave fiyatı: birim fiyat küçük boy; orta ×2, büyük ×3. Tek boylu üründe birim fiyat.
const EXTRA_SIZE_MULTIPLIERS = { Küçük: 1, Orta: 2, Büyük: 3 };
export const extraPriceForSize = (extra, product, sizeLabel) =>
    Number(extra.price) * (getSizeOptions(product).length > 1 && !isPiecePricing(product) ? EXTRA_SIZE_MULTIPLIERS[sizeLabel] ?? 1 : 1);

export const priceForSize = (product, sizeLabel) =>
    getSizeOptions(product).find((o) => o.label === sizeLabel)?.price ?? Number(product.price);

// Fiyat biçimi QR menüde seçilen dile göre (₺1.030 / ₺1,030 / ₺1 030); panel her zaman tr-TR
let priceLocale = 'tr-TR';
export const setPriceLocale = (locale) => {
    priceLocale = locale;
};

// Kuruş varsa gösterilir (₺12,49), yoksa tam sayı (₺320): ekrandaki tutar sunucunun hesapladığıyla aynı
export const formatPrice = (value) =>
    `₺${(Math.round((Number(value) || 0) * 100) / 100).toLocaleString(priceLocale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * Ürün adını büyük harfe çevirir. Dil bağımsız toUpperCase: i → I (MARGHERITA, "MARGHERİTA" değil).
 * CSS `uppercase` + lang="tr" İtalyanca adları bozduğu için kullanılmaz (brif: Türkçe karakter kuralı).
 * Türkçe ad girilirken "İ" gerekiyorsa ad doğrudan büyük harfle yazılmalıdır (LİMONATA).
 */
export const productDisplayName = (name) => (name || '').toUpperCase();

/**
 * Arama için metni sadeleştirir. Adlar büyük harfle kayıtlı (FUNGHI); Türkçe küçültme "I"yı "ı" yaptığı için
 * "funghi" araması eşleşmiyordu. ı/i ve aksanlar (ç, ş, ğ, ö, ü) tek biçime indirilir: "findik" → FINDIK.
 */
const searchKey = (text) =>
    (text || '')
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i')
        .replace(/ς/g, 'σ') // Yunanca kelime sonu sigma
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

export const matchesSearch = (product, query) => {
    const q = searchKey(query.trim());
    return !q || searchKey(product.name).includes(q) || searchKey(product.description).includes(q);
};
