<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Business;
use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\RecipeItem;

class UnopiaSeeder extends Seeder
{
    public function run(): void
    {
        // 1. İşletme Oluştur
        $business = Business::create([
            'name' => 'Unopia Pizza Edirne',
            'is_active' => true,
        ]);

        // 2. Kategoriler
        $pizzaCategory = Category::create(['business_id' => $business->id, 'name' => 'Pizzalar', 'sort_order' => 1]);
        $drinkCategory = Category::create(['business_id' => $business->id, 'name' => 'İçecekler', 'sort_order' => 2]);

        // 3. Hammaddeler (g, ml, adet bazında stoklar)
        $hamur = RawMaterial::create(['business_id' => $business->id, 'name' => 'Pizza Hamuru', 'base_unit' => 'g', 'current_stock' => 50000]); // 50kg
        $peynir = RawMaterial::create(['business_id' => $business->id, 'name' => 'Mozzarella Peyniri', 'base_unit' => 'g', 'current_stock' => 20000]); // 20kg
        $sos = RawMaterial::create(['business_id' => $business->id, 'name' => 'Pizza Sosu', 'base_unit' => 'ml', 'current_stock' => 10000]); // 10lt
        $kutu = RawMaterial::create(['business_id' => $business->id, 'name' => 'Pizza Kutusu', 'base_unit' => 'adet', 'current_stock' => 500]); // Sarf malzemesi
        $kola = RawMaterial::create(['business_id' => $business->id, 'name' => 'Kutu Kola 330ml', 'base_unit' => 'adet', 'current_stock' => 200]);

        // 4. Ürünler
        $margarita = Product::create(['business_id' => $business->id, 'category_id' => $pizzaCategory->id, 'name' => 'Margarita Pizza', 'price' => 250.00]);
        $kolaUrun = Product::create(['business_id' => $business->id, 'category_id' => $drinkCategory->id, 'name' => 'Kutu Kola', 'price' => 50.00]);

        // 5. Reçeteler (Margarita Pizza satıldığında stoktan neler düşecek?)
        RecipeItem::create(['business_id' => $business->id, 'product_id' => $margarita->id, 'raw_material_id' => $hamur->id, 'quantity' => 250]); // 250g hamur
        RecipeItem::create(['business_id' => $business->id, 'product_id' => $margarita->id, 'raw_material_id' => $peynir->id, 'quantity' => 150]); // 150g peynir
        RecipeItem::create(['business_id' => $business->id, 'product_id' => $margarita->id, 'raw_material_id' => $sos->id, 'quantity' => 80]); // 80ml sos
        RecipeItem::create(['business_id' => $business->id, 'product_id' => $margarita->id, 'raw_material_id' => $kutu->id, 'quantity' => 1]); // 1 kutu

        // Kola satıldığında stoktan ne düşecek?
        RecipeItem::create(['business_id' => $business->id, 'product_id' => $kolaUrun->id, 'raw_material_id' => $kola->id, 'quantity' => 1]); // 1 adet kola
    }
}