<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Yönetici ekranları (menü, stok, raporlar, QR yönetimi, şifreler): garson erişemez
        Gate::define('manage', fn (User $user) => $user->isManager()
            ? Response::allow()
            : Response::deny('Bu işlem için yönetici yetkisi gerekir.'));
    }
}
