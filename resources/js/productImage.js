// Ürün görseli: veritabanındaki `image` alanı, yoksa isme göre yerel görsel.
// Eşleşme yoksa null döner: fotoğrafsız ürün kartı kendi düzeniyle gösterilir (brif).
const NAME_IMAGES = [
    [['KOLA'], '/images/drink-kola.jpg'],
    [['LİMONATA', 'LIMONATA'], '/images/drink-limonata.jpg'],
    [['MADEN SUYU', 'SODA'], '/images/drink-madensuyu.jpg'],
    [['NUTELLA'], '/images/pizza-nutella.jpg'],
    [['MARGHERITA'], '/images/pizza-margherita.jpg'],
    [['DIAVOLA'], '/images/pizza-diavola.jpg'],
    [['FUNGHI'], '/images/pizza-funghi.jpg'],
    [['PROSCIUTTO'], '/images/pizza-prosciutto.jpg'],
    [['BURRATA'], '/images/pizza-burrata.jpg'],
    [['SALATA'], '/images/salad-roka-parmesan.jpg'],
];

// Uygulamanın kendi fotoğraflarının sıkıştırılmış WebP kopyaları vardır (orijinal JPG'ler yedek):
// tam boy (ürün detayı) ve 320 px önizleme (menü kartı). Yöneticinin yüklediği fotoğraflara dokunulmaz.
const OPTIMIZED = /^\/images\/((?:pizza|salad|drink)-[a-z-]+)\.jpg$/;

/** variant: 'full' (ürün detayı) | 'thumb' (menü kartı) */
export const getProductImage = (product, variant = 'full') => {
    let src = null;
    // Eski seed'deki telefon ekran görüntüsü (mockup) ürün görseli değildir
    if (product.image && !product.image.includes('/mockup-')) {
        src = product.image;
    } else {
        const name = (product.name || '').toUpperCase();
        src = NAME_IMAGES.find(([keys]) => keys.some((k) => name.includes(k)))?.[1] ?? null;
    }
    const m = src?.match(OPTIMIZED);
    return m ? `/images/${m[1]}${variant === 'thumb' ? '-thumb' : ''}.webp` : src;
};

/** Ürünün kullanılabilir boyları ve fiyatları (yalnızca tanımlı olanlar) */
export const getSizeOptions = (product) => {
    const sizes = product.sizes && typeof product.sizes === 'object' ? product.sizes : {};
    return [
        { label: 'Küçük', key: 'small' },
        { label: 'Orta', key: 'medium' },
        { label: 'Büyük', key: 'large' },
    ]
        .filter((sz) => sizes[sz.key])
        .map((sz) => ({ label: sz.label, price: Number(sizes[sz.key]) }));
};

/** Varsayılan boy: Orta varsa Orta, yoksa tanımlı ilk boy, hiç yoksa "Orta" (taban fiyat) */
export const getDefaultSize = (product) => {
    const options = getSizeOptions(product);
    return options.find((o) => o.label === 'Orta')?.label || options[0]?.label || 'Orta';
};

export const priceForSize = (product, sizeLabel) =>
    getSizeOptions(product).find((o) => o.label === sizeLabel)?.price ?? Number(product.price);

// Kuruş varsa gösterilir (₺12,49), yoksa tam sayı (₺320): ekrandaki tutar sunucunun hesapladığıyla aynı
export const formatPrice = (value) =>
    `₺${(Math.round((Number(value) || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

export const matchesSearch = (product, query) => {
    const q = searchKey(query.trim());
    return !q || searchKey(product.name).includes(q) || searchKey(product.description).includes(q);
};
