<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adete göre fiyatlandırma (atıştırmalıklar: 4'lü / 6'lı). Fiyatlar yine sizes sütunundaki
     * small / medium / large yuvalarında durur; piece_counts aynı yuvaların adetini tutar:
     * {"small": 4, "medium": 6}. Dolu ise ürün boy yerine adetle gösterilir.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->json('piece_counts')->nullable()->after('sizes');
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('piece_counts'));
    }
};
