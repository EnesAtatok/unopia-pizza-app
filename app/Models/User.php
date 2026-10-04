<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'business_id',
        'role',
        'name',
        'email',
        'password',
        'pin',
    ];

    protected $hidden = [
        'password',
        'pin',
        'remember_token',
    ];

    /** Panelde tüm ekranlara erişen roller (diğerleri: garson) */
    public const MANAGER_ROLES = ['patron', 'mudur'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Panel şifresi (4 hane) uygulama anahtarıyla HMAC olarak saklanır: girişte doğrudan aranır
     * (bcrypt ile her personeli tek tek denemek gerekmez), anahtar olmadan çözülemez.
     */
    public static function hashPin(string $pin): string
    {
        return hash_hmac('sha256', $pin, (string) config('app.key'));
    }

    public static function findByPin(string $pin): ?self
    {
        return self::where('pin', self::hashPin($pin))->first();
    }

    public function isManager(): bool
    {
        return in_array($this->role, self::MANAGER_ROLES, true);
    }
}