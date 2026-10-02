<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RawMaterial extends Model
{
    protected $fillable = ['business_id', 'name', 'base_unit', 'current_stock', 'critical_level', 'average_cost'];

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function recipeItems()
    {
        return $this->hasMany(RecipeItem::class);
    }
}
