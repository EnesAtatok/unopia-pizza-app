<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['business_id', 'name', 'sort_order'];

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
