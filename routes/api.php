<?php

use App\Http\Middleware\SetCustomerLocale;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ExtraController;
use App\Http\Controllers\Api\ProductController;

// QR MENÜ (yalnızca görüntüleme). Hata mesajları seçilen dilde döner (X-Locale: tr, en, bg, el)
Route::middleware(SetCustomerLocale::class)->group(function () {
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/extras', [ExtraController::class, 'index']);
});

// YÖNETİM PANELİ
Route::prefix('panel')->group(function () {
    // Menü yönetimi
    Route::get('/products', [ProductController::class, 'panelIndex']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::post('/products/bulk-price', [ProductController::class, 'bulkPrice']);
    Route::post('/products/{id}', [ProductController::class, 'update'])->whereNumber('id'); // multipart (fotoğraf) için POST
    Route::delete('/products/{id}', [ProductController::class, 'destroy'])->whereNumber('id');
    Route::patch('/products/{id}/availability', [ProductController::class, 'setAvailability'])->whereNumber('id');
    Route::patch('/products/{id}/visibility', [ProductController::class, 'setVisibility'])->whereNumber('id');
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::patch('/categories/{id}', [CategoryController::class, 'update'])->whereNumber('id');
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy'])->whereNumber('id');

    // İlaveler (ek malzemeler): birim fiyat küçük boy, orta ×2, büyük ×3
    Route::get('/extras', [ExtraController::class, 'panelIndex']);
    Route::post('/extras', [ExtraController::class, 'store']);
    Route::patch('/extras/{id}', [ExtraController::class, 'update'])->whereNumber('id');
    Route::delete('/extras/{id}', [ExtraController::class, 'destroy'])->whereNumber('id');
});
