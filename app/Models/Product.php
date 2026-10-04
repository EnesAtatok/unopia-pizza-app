<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'business_id',
        'category_id',
        'name',
        'description',
        'ingredients',
        'allergens',
        'calories',
        'sizes',
        'image',
        'is_vegetarian',
        'price',
        'is_active',
        'auto_sold_out',
        'is_visible',
        'sort_order',
    ];

    protected $casts = [
        'allergens' => 'array',
        'calories' => 'array',
        'sizes' => 'array',
        'is_vegetarian' => 'boolean',
        'is_active' => 'boolean',
        'auto_sold_out' => 'boolean',
        'is_visible' => 'boolean',
        'price' => 'decimal:2',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public const SIZE_LABELS = ['small' => 'Küçük', 'medium' => 'Orta', 'large' => 'Büyük'];

    /**
     * Reçete Orta boy için girilir; diğer boylar hammaddeyi bu oranla düşer
     * (25 / 30 / 35 cm pizza alanlarına yakın).
     */
    public const SIZE_STOCK_FACTORS = ['small' => 0.7, 'medium' => 1.0, 'large' => 1.35];

    public static function sizeKey(?string $size): ?string
    {
        return match (mb_strtolower(trim((string) $size))) {
            'küçük', 'kucuk', 'small' => 'small',
            'orta', 'medium' => 'medium',
            'büyük', 'buyuk', 'large' => 'large',
            default => null,
        };
    }

    /** Üründe tanımlı boy anahtarları; boy tanımı yoksa yalnızca "medium" (taban fiyat) */
    public function availableSizeKeys(): array
    {
        $keys = is_array($this->sizes) ? array_keys(array_filter($this->sizes, fn ($v) => $v !== null && $v !== '')) : [];
        $keys = array_values(array_intersect(array_keys(self::SIZE_LABELS), $keys));

        return $keys ?: ['medium'];
    }

    /**
     * Gelen boy etiketini doğrular ve standart etikete çevirir. Boş gelirse varsayılan boy.
     * Üründe olmayan / tanınmayan boy için null döner (sipariş reddedilir).
     */
    public function resolveSize(?string $size): ?string
    {
        $keys = $this->availableSizeKeys();

        if ($size === null || trim($size) === '') {
            return self::SIZE_LABELS[in_array('medium', $keys, true) ? 'medium' : $keys[0]];
        }

        $key = self::sizeKey($size);

        return $key && in_array($key, $keys, true) ? self::SIZE_LABELS[$key] : null;
    }

    /**
     * Boy etiketine ("Küçük" / "Orta" / "Büyük") göre fiyat. Tanımlı boy yoksa taban fiyat.
     */
    public function priceForSize(?string $size): float
    {
        $key = self::sizeKey($size) ?? 'medium';

        if (is_array($this->sizes) && isset($this->sizes[$key])) {
            return (float) $this->sizes[$key];
        }

        return (float) $this->price;
    }

    /** Boy başına hammadde çarpanı (tek boylu ürünlerde her zaman 1) */
    public function stockFactorForSize(?string $size): float
    {
        if (count($this->availableSizeKeys()) < 2) {
            return 1.0;
        }

        return self::SIZE_STOCK_FACTORS[self::sizeKey($size) ?? 'medium'];
    }

    /** Ürünün en küçük boyunu yapmaya yetecek çarpan (otomatik Tükendi kontrolü için) */
    public function minStockFactor(): float
    {
        if (count($this->availableSizeKeys()) < 2) {
            return 1.0;
        }

        return min(array_map(fn ($k) => self::SIZE_STOCK_FACTORS[$k], $this->availableSizeKeys()));
    }

    public function recipeItems()
    {
        return $this->hasMany(RecipeItem::class);
    }
}
