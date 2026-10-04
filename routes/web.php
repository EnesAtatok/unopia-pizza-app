<?php

use App\Models\RestaurantTable;
use Illuminate\Support\Facades\Route;

// Yerel deneme: ana adres test masasının QR bağlantısına yönlenir (bkz. config/business.php)
Route::get('/', function () {
    $name = config('business.test_table');
    if ($name && app()->environment('local')) {
        $table = RestaurantTable::where('name', $name)->where('is_active', true)->first();
        if ($table) {
            return redirect('/masa/' . $table->qr_token);
        }
    }

    return view('welcome');
});

Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '^(?!api).*$');
