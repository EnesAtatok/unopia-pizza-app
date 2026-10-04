import React, { useState } from 'react';
import { getProductImage } from '../../productImage';

/**
 * Ürün fotoğrafı (kutusuyla birlikte). Fotoğraf yoksa ya da yüklenemezse kutu hiç çizilmez,
 * `fallback` gösterilir — fotoğrafsız ürün kartı boş bir kare yerine kendi düzeniyle görünür.
 */
export const ProductPhoto = ({ product, variant = 'full', wrapperClassName = '', className = '', fallback = null, children }) => {
    const src = getProductImage(product, variant);
    const [failedSrc, setFailedSrc] = useState(null);

    if (!src || failedSrc === src) return fallback;

    return (
        <div className={wrapperClassName}>
            <img
                src={src}
                alt={product.name}
                loading="lazy"
                className={className}
                onError={() => setFailedSrc(src)}
            />
            {children}
        </div>
    );
};
