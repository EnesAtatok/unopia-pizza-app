// Menü verisinin (ürün, kategori, ilave) seçilen dildeki karşılığı.
// Türkçe asıl alanlar `_tr` içinde saklanır: işlem tekrar uygulanabilir ve arama iki dilde de çalışır.

export const localizeProduct = (product, lang) => {
    if (!product) return product;
    const base = product._tr || { name: product.name, description: product.description, ingredients: product.ingredients, chef_note: product.chef_note };
    const tr = lang === 'tr' ? {} : product.translations?.[lang] || {};
    return {
        ...product,
        _tr: base,
        name: tr.name || base.name,
        description: tr.description || base.description,
        ingredients: tr.ingredients || base.ingredients,
        chef_note: tr.chef_note || base.chef_note,
    };
};

import { trPieceLabel } from '../productImage';

/** Boy / adet seçeneğinin müşteriye görünen adı: "Orta", "Medium", "4'lü", "4 pcs" */
export const sizeOptionName = (option, t, lang) => {
    if (option.count) return lang === 'tr' ? trPieceLabel(option.count) : t('size.pieces', { n: option.count });
    return t(`size.${option.label}`, null, option.label);
};

// İlave adı: çevirisi yoksa Türkçe
export const localizeExtra = (extra, lang) => ({
    ...extra,
    name: (lang !== 'tr' && extra.translations?.[lang]?.name) || extra.name,
});

export const localizeCategory = (category, lang) => {
    const base = category._trName || category.name;
    return { ...category, _trName: base, name: (lang !== 'tr' && category.translations?.[lang]?.name) || base };
};