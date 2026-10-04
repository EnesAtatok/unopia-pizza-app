<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
            $table->text('ingredients')->nullable()->after('description');
            $table->json('allergens')->nullable()->after('ingredients');
            $table->json('calories')->nullable()->after('allergens');
            $table->json('sizes')->nullable()->after('calories');
            $table->string('image')->nullable()->after('sizes');
            $table->boolean('is_vegetarian')->default(false)->after('image');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('source')->default('QR')->after('table_number'); // QR veya Garson
            $table->text('notes')->nullable()->after('source');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('size')->default('Orta')->after('quantity');
            $table->text('notes')->nullable()->after('size');
        });

        Schema::create('waiter_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained('businesses')->onDelete('cascade');
            $table->string('table_number');
            $table->string('reason'); // Sipariş vermek istiyorum, Hesabı istiyorum, Başka bir konu
            $table->string('status')->default('pending'); // pending, resolved
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waiter_calls');

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['size', 'notes']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['source', 'notes']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['description', 'ingredients', 'allergens', 'calories', 'sizes', 'image', 'is_vegetarian']);
        });
    }
};
