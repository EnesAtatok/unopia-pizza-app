<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WaiterCall extends Model
{
    protected $fillable = ['business_id', 'table_number', 'reason', 'status'];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
