<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class RestaurantTable extends Model
{
    protected $fillable = ['business_id', 'name', 'section', 'qr_token', 'is_active', 'sort_order'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (RestaurantTable $table) {
            $table->qr_token ??= self::generateToken();
        });
    }

    public static function generateToken(): string
    {
        do {
            $token = Str::lower(Str::random(16));
        } while (self::where('qr_token', $token)->exists());

        return $token;
    }

    /**
     * QR kodun içine gömülen müşteri linki
     */
    public function getQrUrlAttribute(): string
    {
        return url('/masa/' . $this->qr_token);
    }

    public static function findActiveByToken(?string $token): ?self
    {
        if (!$token) {
            return null;
        }

        return self::where('qr_token', $token)->where('is_active', true)->first();
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
