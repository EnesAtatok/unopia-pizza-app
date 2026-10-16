<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * İlave (ek malzeme). price = birim fiyat = küçük boy fiyatı.
 */
class Extra extends Model
{
    protected $fillable = ['business_id', 'name', 'translations', 'price', 'is_active', 'sort_order'];

    protected $casts = [
        'translations' => 'array',
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /** Boya göre birim fiyat çarpanı: küçük ×1, orta ×2, büyük ×3 */
    public const SIZE_MULTIPLIERS = ['small' => 1, 'medium' => 2, 'large' => 3];
}
