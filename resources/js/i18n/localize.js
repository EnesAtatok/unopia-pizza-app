// Menü verisinin (ürün, kategori, masa adı) seçilen dildeki karşılığı.
// Türkçe asıl alanlar `_tr` içinde saklanır: işlem tekrar uygulanabilir ve arama iki dilde de çalışır.

export const localizeProduct = (product, lang) => {
    if (!product) return product;
    const base = product._tr || { name: product.name, description: product.description, ingredients: product.ingredients };
    const tr = lang === 'tr' ? {} : product.translations?.[lang] || {};
    return {
        ...product,
        _tr: base,
        name: tr.name || base.name,
        description: tr.description || base.description,
        ingredients: tr.ingredients || base.ingredients,
    };
};

export const localizeCategory = (category, lang) => {
    const base = category._trName || category.name;
    return { ...category, _trName: base, name: (lang !== 'tr' && category.translations?.[lang]?.name) || base };
};

// Masa adları veridir ("Masa 3", "Bahçe 2"): yalnızca bilinen önek çevrilir
export const tableLabel = (name, t) =>
    (name || '').replace(/^Masa(?=\s)/, t('table.table')).replace(/^Bahçe(?=\s)/, t('table.garden'));
