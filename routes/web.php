<?php

use Illuminate\Support\Facades\Route;

// Tek sayfalık uygulama: /panel yönetim paneli, diğer tüm adresler QR menü
Route::view('/{any?}', 'welcome')->where('any', '^(?!api).*$');
