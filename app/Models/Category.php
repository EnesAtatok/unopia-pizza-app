<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['business_id', 'name', 'translations', 'sort_order'];

    // {"en": {"name": "Pizzas"}, "bg": {...}, "el": {...}} — QR menü dil desteği
    protected $casts = ['translations' => 'array'];

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
