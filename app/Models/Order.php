<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    // Akış: pending (garson onayı bekliyor) → approved (mutfağa iletildi) → preparing → ready
    // → served (masaya servis edildi) → completed (hesap kapandı). Reddedilen: rejected.
    public const PENDING = 'pending';
    public const APPROVED = 'approved';
    public const PREPARING = 'preparing';
    public const READY = 'ready';
    public const SERVED = 'served';
    public const COMPLETED = 'completed';
    public const REJECTED = 'rejected';

    /** Masayı "açık" tutan durumlar (hesap henüz kapanmadı) */
    public const OPEN_STATUSES = [self::PENDING, self::APPROVED, self::PREPARING, self::READY, self::SERVED];

    /** Mutfak ekranında görünen durumlar */
    public const KITCHEN_STATUSES = [self::APPROVED, self::PREPARING, self::READY];

    protected $fillable = [
        'business_id',
        'table_number',
        'source',
        'client_ref',
        'notes',
        'status',
        'total_amount',
        'payment_method',
        'cash_amount',
        'card_amount',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'cash_amount' => 'decimal:2',
        'card_amount' => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function recalculateTotal(): void
    {
        $this->update([
            'total_amount' => $this->items()->get()->sum(fn ($i) => (float) $i->price * $i->quantity),
        ]);
    }
}
