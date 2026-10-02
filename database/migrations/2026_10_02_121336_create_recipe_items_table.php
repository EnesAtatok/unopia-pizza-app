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
    Schema::create('recipe_items', function (Blueprint $table) {
        $table->id();
        $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
        $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
        $table->foreignId('raw_material_id')->constrained('raw_materials')->onDelete('cascade');
        $table->decimal('quantity', 12, 3); // Kullanılan miktar (decimal 12,3 kuralı)
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recipe_items');
    }
};
