<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Hesap bölme: tek adisyonda nakit + kart karışık ödeme tutarları ayrı kaydedilir
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('cash_amount', 10, 2)->nullable()->after('payment_method');
            $table->decimal('card_amount', 10, 2)->nullable()->after('cash_amount');
        });

        // Stok biten ürün otomatik "Tükendi" olur; stok girilince yalnızca bu ürünler geri açılır
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('auto_sold_out')->default(false)->after('is_active');
        });

        // Eski kapatılmış adisyonlar: tutarın tamamı tek ödeme yöntemine yazılır
        DB::table('orders')->where('status', 'completed')->where('payment_method', 'cash')
            ->update(['cash_amount' => DB::raw('total_amount'), 'card_amount' => 0]);
        DB::table('orders')->where('status', 'completed')->where('payment_method', 'credit_card')
            ->update(['card_amount' => DB::raw('total_amount'), 'cash_amount' => 0]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['cash_amount', 'card_amount']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('auto_sold_out');
        });
    }
};
