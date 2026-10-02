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
    Schema::create('orders', function (Blueprint $table) {
        $table->id();
        $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
        $table->string('table_number')->nullable(); // Masa numarası veya paket sipariş bilgisi
        $table->string('status')->default('pending'); // pending, preparing, ready, completed
        $table->decimal('total_amount', 10, 2)->default(0);
        $table->timestamps();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
