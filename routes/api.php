<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ReportController;

// HERKESE AÇIK ROTALAR
Route::post('/login', [AuthController::class, 'login']);
Route::get('/categories', [CategoryController::class, 'index']); // QR Menü için açık kalabilir
Route::get('/products', [ProductController::class, 'index']); // QR Menü için açık kalabilir

// SADECE GİRİŞ YAPAN PERSONELİN ERİŞEBİLECEĞİ ROTALAR
Route::middleware('auth:sanctum')->group(function () {
    
    // Aktif giriş yapmış kullanıcının bilgilerini getirme
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Sipariş İşlemleri
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/kitchen/orders', [OrderController::class, 'activeOrders']);
    Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);

    // Ödeme alma ve adisyon kapatma
    Route::post('/orders/{id}/checkout', [OrderController::class, 'checkout']);

    // Güvenli Çıkış (Logout)
    Route::post('/logout', [AuthController::class, 'logout']);

    // Gün sonu Z-Raporu ve Stok Uyarıları
    Route::get('/reports/daily', [ReportController::class, 'dailySummary']);
});