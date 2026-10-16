<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Şefin önerisi: "Yanında limonata iyi gider" gibi isteğe bağlı not (QR menü ürün detayında)
        Schema::table('products', function (Blueprint $table) {
            $table->string('chef_note', 160)->nullable()->after('ingredients');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('chef_note');
        });
    }
};
