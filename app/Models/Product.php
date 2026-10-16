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
        'chef_note',
        'translations',
        'allergens',
        'calories',
        'sizes',
        'piece_counts',
        'image',
        'is_vegetarian',
        'has_extras',
        'price',
        'is_active',
        'is_visible',
        'sort_order',
    ];

    protected $casts = [
        'translations' => 'array',
        'allergens' => 'array',
        'calories' => 'array',
        'sizes' => 'array',
        'piece_counts' => 'array',
        'is_vegetarian' => 'boolean',
        'has_extras' => 'boolean',
        'is_active' => 'boolean',
        'is_visible' => 'boolean',
        'price' => 'decimal:2',
    ];

    /** QR menü dilleri (tr asıl alanlar, diğerleri translations sütununda) */
    public const LOCALES = ['tr', 'en', 'bg', 'el'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
