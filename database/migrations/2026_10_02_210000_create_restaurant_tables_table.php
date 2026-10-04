<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Her masanın kendine ait QR kodu: QR linki /masa/{qr_token} şeklindedir.
        // Token tahmin edilemez olduğu için müşteri URL'yi değiştirerek başka masaya sipariş veremez.
        Schema::create('restaurant_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->string('name');                       // "Masa 4", "Bahçe 2"
            $table->string('section')->default('salon');  // salon, bahce
            $table->string('qr_token', 32)->unique();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['business_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_tables');
    }
};
