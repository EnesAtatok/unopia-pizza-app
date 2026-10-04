<?php

// İşletme kuralları. Çalışma saatleri resources/js/config/business.js ile aynı tutulmalıdır.
return [
    'timezone' => env('BUSINESS_TIMEZONE', 'Europe/Istanbul'),

    'hours' => [
        'open' => env('BUSINESS_OPEN', '11:00'),
        'close' => env('BUSINESS_CLOSE', '23:00'),
    ],

    // Yalnızca yerel ortamda (APP_ENV=local) geçerli deneme ayarları. Canlıda etkisizdir.
    // test_table: ana adres bu masanın QR bağlantısına yönlenir (masa yine QR token'ından gelir).
    // always_open: çalışma saati dışında da QR siparişi kabul edilir.
    'test_table' => env('BUSINESS_TEST_TABLE'),
    'always_open' => (bool) env('BUSINESS_ALWAYS_OPEN', false),

    // QR sipariş sınırları (kötüye kullanım / yanlışlıkla dev sipariş koruması)
    'max_order_lines' => 30,
    'max_order_quantity' => 60,
    'max_pending_orders_per_table' => 3,
];
