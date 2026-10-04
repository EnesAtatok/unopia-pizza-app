<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Masa detayında her ürün satırının kaynağı (QR / Garson) ayrı gösterilir
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('source')->default('QR')->after('notes');
        });

        // Menü yönetimi: ürün silinmeden menüden kaldırılabilir (geçmiş adisyonlar bozulmaz)
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_visible')->default(true)->after('is_active');
            $table->unsignedInteger('sort_order')->default(0)->after('is_visible');
        });
        // Not: sipariş durumları string sütunda tutulur, şema değişikliği gerekmez:
        // pending (garson onayı bekliyor) → approved (mutfağa gitti) → preparing → ready
        // → served → completed (hesap kapandı) | rejected
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('source');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['is_visible', 'sort_order']);
        });
    }
};
