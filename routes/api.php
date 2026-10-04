<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TableController;
use App\Http\Controllers\Api\StockController;

// HERKESE AÇIK ROTALAR (QR Menü & Müşteri Ekranı)
// Panel girişi 4 haneli şifre ile: tahmin denemelerine karşı dakikada 5 deneme
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/tables/resolve/{token}', [TableController::class, 'resolve']); // QR koddaki masa token'ı

// Müşteri siparişi, sipariş takibi ve garson çağrısı (masa token'ı ile doğrulanır)
Route::middleware('throttle:30,1')->group(function () {
    Route::post('/orders', [OrderController::class, 'store']);
    Route::post('/waiter-calls', [OrderController::class, 'callWaiter']);
});
Route::get('/orders/{id}/track', [OrderController::class, 'track'])->whereNumber('id');

// PERSONEL ROTALARI (giriş yapmış personel, Sanctum token)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Masalar & Bekleyenler
    Route::get('/panel/tables', [OrderController::class, 'panelTables']);
    Route::post('/panel/orders/{id}/approve', [OrderController::class, 'approve'])->whereNumber('id');
    Route::post('/panel/orders/{id}/reject', [OrderController::class, 'reject'])->whereNumber('id');
    Route::post('/panel/tables/items', [OrderController::class, 'addItemToTable']);
    Route::post('/panel/tables/checkout', [OrderController::class, 'checkoutTable']);
    Route::post('/panel/tables/move', [OrderController::class, 'moveTable']);
    Route::patch('/panel/waiter-calls/{id}/resolve', [OrderController::class, 'resolveWaiterCall'])->whereNumber('id');

    // Mutfak
    Route::get('/kitchen/orders', [OrderController::class, 'activeOrders']);
    Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus'])->whereNumber('id');

    // QR kodlar: garson görüntüler, yazdırır, indirir
    Route::get('/panel/qr-tables', [TableController::class, 'index']);

    // YALNIZCA YÖNETİCİ: menü, stok, raporlar, QR yönetimi, şifreler
    Route::middleware('can:manage')->group(function () {
        // Menü yönetimi
        Route::get('/panel/products', [ProductController::class, 'panelIndex']);
        Route::post('/panel/products', [ProductController::class, 'store']);
        Route::post('/panel/products/{id}', [ProductController::class, 'update'])->whereNumber('id'); // multipart (fotoğraf) için POST
        Route::patch('/panel/products/{id}/availability', [ProductController::class, 'setAvailability'])->whereNumber('id');
        Route::patch('/panel/products/{id}/visibility', [ProductController::class, 'setVisibility'])->whereNumber('id');
        Route::post('/panel/categories', [CategoryController::class, 'store']);

        // Stok ve reçete
        Route::get('/panel/stock', [StockController::class, 'index']);
        Route::post('/panel/stock', [StockController::class, 'store']);
        Route::post('/panel/stock/{id}/purchase', [StockController::class, 'purchase'])->whereNumber('id');
        Route::post('/panel/stock/{id}/count', [StockController::class, 'count'])->whereNumber('id');
        Route::post('/panel/stock/{id}/waste', [StockController::class, 'waste'])->whereNumber('id');
        Route::get('/panel/stock/{id}/movements', [StockController::class, 'movements'])->whereNumber('id');
        Route::get('/panel/recipes/{productId}', [StockController::class, 'recipe'])->whereNumber('productId');
        Route::put('/panel/recipes/{productId}', [StockController::class, 'saveRecipe'])->whereNumber('productId');

        // Raporlar
        Route::get('/reports/daily', [ReportController::class, 'dailySummary']);

        // Masa & QR kod yönetimi
        Route::post('/panel/qr-tables', [TableController::class, 'store']);
        Route::patch('/panel/qr-tables/{id}', [TableController::class, 'update'])->whereNumber('id');
        Route::post('/panel/qr-tables/{id}/regenerate', [TableController::class, 'regenerate'])->whereNumber('id');

        // Panel şifreleri
        Route::put('/panel/pins', [AuthController::class, 'updatePins']);
    });
});
