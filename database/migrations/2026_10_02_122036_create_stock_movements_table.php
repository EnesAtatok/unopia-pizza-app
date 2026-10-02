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
    Schema::create('stock_movements', function (Blueprint $table) {
        $table->id();
        $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
        $table->foreignId('raw_material_id')->constrained('raw_materials')->onDelete('cascade');
        $table->string('type'); // 'purchase' (alış), 'sale' (satış düşümü), 'waste' (fire), 'adjustment' (sayım), 'production' (üretim)
        $table->decimal('quantity', 12, 3); // Stoğa giren için pozitif, stoktan çıkan için negatif değer
        $table->string('description')->nullable(); // Örn: "Fatura: A123", "Adisyon: 45", "Dökülen süt"
        $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // İşlemi yapan personeli loglamak için
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
