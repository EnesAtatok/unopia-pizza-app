<?php

namespace App\Http\Middleware;

use App\Models\Product;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * QR menü: müşterinin seçtiği dil X-Locale başlığıyla gelir (tr, en, bg, el).
 * Müşteriye giden mesajlar bu dilde döner; panel istekleri Türkçe kalır.
 */
class SetCustomerLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('X-Locale');
        if (in_array($locale, Product::LOCALES, true)) {
            app()->setLocale($locale);
        }

        return $next($request);
    }
}
