<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Müşteri siparişinin istemci anahtarı: aynı gönderim (çift dokunuş / ağ tekrarı) ikinci sipariş açmaz
        Schema::table('orders', function (Blueprint $table) {
            $table->string('client_ref', 40)->nullable()->unique()->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['client_ref']);
            $table->dropColumn('client_ref');
        });
    }
};
