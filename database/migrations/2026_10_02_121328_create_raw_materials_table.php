<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('raw_materials', function (Blueprint $table) {
        $table->id();
        $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
        $table->string('name');
        $table->string('base_unit'); // 'g', 'ml' veya 'adet'
        $table->decimal('current_stock', 12, 3)->default(0); // Anlık stok (raporlama hızı için cache)
        $table->decimal('critical_level', 12, 3)->default(0); // Panelde uyarı verecek minimum miktar
        $table->decimal('average_cost', 10, 4)->default(0); // TL/birim bazında ortalama maliyet
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raw_materials');
    }
};
