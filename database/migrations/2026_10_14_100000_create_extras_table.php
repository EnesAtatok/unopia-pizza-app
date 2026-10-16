<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * İlaveler (ek malzemeler): tek bir liste, birim fiyat küçük boy fiyatıdır.
     * Orta boyda ×2, büyük boyda ×3 gösterilir (bkz. Extra::SIZE_MULTIPLIERS).
     * Ürün bazında products.has_extras ile hangi üründe gösterileceği seçilir.
     */
    public function up(): void
    {
        Schema::create('extras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->json('translations')->nullable();
            $table->decimal('price', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->boolean('has_extras')->default(false)->after('is_vegetarian');
        });

        // Mevcut menü: "Pizzalar" kategorisindeki ürünlerde ilaveler açık başlar
        $pizzaCategoryIds = DB::table('categories')->where('name', 'Pizzalar')->pluck('id');
        DB::table('products')->whereIn('category_id', $pizzaCategoryIds)->update(['has_extras' => true]);

        // Örnek ilaveler (panelden düzenlenir / silinir)
        $businessId = DB::table('businesses')->orderBy('id')->value('id');
        if ($businessId) {
            $now = now();
            foreach (self::SAMPLES as $i => [$name, $price, $tr]) {
                DB::table('extras')->insert([
                    'business_id' => $businessId,
                    'name' => $name,
                    'translations' => json_encode($tr, JSON_UNESCAPED_UNICODE),
                    'price' => $price,
                    'sort_order' => $i + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('has_extras'));
        Schema::dropIfExists('extras');
    }

    private const SAMPLES = [
        ['Ekstra Mozzarella', 30, ['en' => ['name' => 'Extra Mozzarella'], 'bg' => ['name' => 'Допълнителна моцарела'], 'el' => ['name' => 'Έξτρα μοτσαρέλα']]],
        ['Mantar', 20, ['en' => ['name' => 'Mushrooms'], 'bg' => ['name' => 'Гъби'], 'el' => ['name' => 'Μανιτάρια']]],
        ['Sucuk', 35, ['en' => ['name' => 'Sucuk (spicy beef sausage)'], 'bg' => ['name' => 'Суджук'], 'el' => ['name' => 'Σουτζούκι']]],
        ['Siyah Zeytin', 15, ['en' => ['name' => 'Black Olives'], 'bg' => ['name' => 'Черни маслини'], 'el' => ['name' => 'Μαύρες ελιές']]],
        ['Jalapeño', 15, ['en' => ['name' => 'Jalapeño'], 'bg' => ['name' => 'Халапеньо'], 'el' => ['name' => 'Χαλαπένιο']]],
    ];
};
