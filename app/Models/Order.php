<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = ['business_id', 'table_number', 'status', 'total_amount', 'payment_method'];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
