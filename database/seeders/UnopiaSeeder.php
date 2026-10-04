<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Business;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\RecipeItem;
use App\Models\Order;
use App\Models\WaiterCall;

class UnopiaSeeder extends Seeder
{
    public function run(): void
    {
        // 1. İşletme
        $business = Business::firstOrCreate(
            ['id' => 1],
            ['name' => 'Unopia Pizza Edirne', 'is_active' => true]
        );

        // 2. Kullanıcılar (Patron, Müdür, Garson, Mutfak)
        $users = [
            ['name' => 'Patron (Yönetici)', 'email' => 'admin@unopia.com', 'role' => 'patron', 'password' => Hash::make('123456')],
            ['name' => 'Müdür Ahmet', 'email' => 'mudur@unopia.com', 'role' => 'mudur', 'password' => Hash::make('123456')],
            ['name' => 'Garson Ali', 'email' => 'garson@unopia.com', 'role' => 'garson', 'password' => Hash::make('123456')],
            ['name' => 'Mutfak Şefi Can', 'email' => 'mutfak@unopia.com', 'role' => 'mutfak', 'password' => Hash::make('123456')],
        ];

        // Panel giriş şifreleri (yalnızca ilk kurulumda; yöneticinin değiştirdiği şifre ezilmez)
        $initialPins = ['admin@unopia.com' => '9999', 'garson@unopia.com' => '1111'];

        foreach ($users as $u) {
            $user = User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'business_id' => $business->id,
                    'name' => $u['name'],
                    'role' => $u['role'],
                    'password' => $u['password'],
                ]
            );

            if (isset($initialPins[$u['email']]) && !$user->pin) {
                $user->update(['pin' => User::hashPin($initialPins[$u['email']])]);
            }
        }

        // Masalar ve her masaya özel QR token'ları
        $this->call(RestaurantTableSeeder::class);

        // 3. Kategoriler
        $catPizzalar = Category::updateOrCreate(['business_id' => $business->id, 'name' => 'Pizzalar'], ['sort_order' => 1]);
        $catTatli = Category::updateOrCreate(['business_id' => $business->id, 'name' => 'Tatlı Pizzalar'], ['sort_order' => 2]);
        $catSalatalar = Category::updateOrCreate(['business_id' => $business->id, 'name' => 'Salatalar'], ['sort_order' => 3]);
        $catIcecekler = Category::updateOrCreate(['business_id' => $business->id, 'name' => 'İçecekler'], ['sort_order' => 4]);

        // 4. Hammaddeler
        $hamur = RawMaterial::firstOrCreate(['business_id' => $business->id, 'name' => 'Pizza Hamuru'], ['base_unit' => 'g', 'current_stock' => 50000, 'critical_level' => 5000]);
        $peynir = RawMaterial::firstOrCreate(['business_id' => $business->id, 'name' => 'Mozzarella Peyniri'], ['base_unit' => 'g', 'current_stock' => 20000, 'critical_level' => 3000]);
        $sos = RawMaterial::firstOrCreate(['business_id' => $business->id, 'name' => 'San Marzano Sosu'], ['base_unit' => 'ml', 'current_stock' => 15000, 'critical_level' => 2000]);
        $jambon = RawMaterial::firstOrCreate(['business_id' => $business->id, 'name' => 'Dana Jambon'], ['base_unit' => 'g', 'current_stock' => 5000, 'critical_level' => 1000]);
        $sucuk = RawMaterial::firstOrCreate(['business_id' => $business->id, 'name' => 'Dana Sucuk'], ['base_unit' => 'g', 'current_stock' => 6000, 'critical_level' => 1000]);
        $mantar = RawMaterial::firstOrCreate(['business_id' => $business->id, 'name' => 'Kestane Mantarı'], ['base_unit' => 'g', 'current_stock' => 4000, 'critical_level' => 800]);
        $kutu = RawMaterial::firstOrCreate(['business_id' => $business->id, 'name' => 'Pizza Kutusu'], ['base_unit' => 'adet', 'current_stock' => 400, 'critical_level' => 50]);
        $kolaStok = RawMaterial::firstOrCreate(['business_id' => $business->id, 'name' => 'Kutu Kola 330ml'], ['base_unit' => 'adet', 'current_stock' => 120, 'critical_level' => 24]);

        // 5. Ürünler (Brife ve görsellere birebir uyumlu)
        $productsData = [
            [
                'category_id' => $catPizzalar->id,
                'name' => 'MARGHERITA',
                'description' => 'San Marzano domates, mozzarella, fesleğen, zeytinyağı',
                'ingredients' => 'San Marzano domates, taze mozzarella, fesleğen, soğuk sıkım sızma zeytinyağı',
                'allergens' => ['Gluten', 'Süt'],
                'calories' => ['portion' => 820, 'slice' => 205],
                'sizes' => ['small' => 260, 'medium' => 320, 'large' => 390],
                'price' => 320.00,
                'image' => '/images/pizza-margherita.jpg',
                'is_vegetarian' => true,
                'is_active' => true,
            ],
            [
                'category_id' => $catPizzalar->id,
                'name' => 'DIAVOLA',
                'description' => 'San Marzano domates, mozzarella, sucuk, acı yağ',
                'ingredients' => 'San Marzano domates, taze mozzarella, acılı dana sucuk, chili biberi, acı zeytinyağı',
                'allergens' => ['Gluten', 'Süt'],
                'calories' => ['portion' => 890, 'slice' => 222],
                'sizes' => ['small' => 290, 'medium' => 355, 'large' => 425],
                'price' => 355.00,
                'image' => '/images/pizza-diavola.jpg',
                'is_vegetarian' => false,
                'is_active' => true,
            ],
            [
                'category_id' => $catPizzalar->id,
                'name' => 'FUNGHI',
                'description' => 'Mozzarella, mantar, trüf yağı, parmesan',
                'ingredients' => 'Beyaz taban, taze mozzarella, sotelenmiş kestane mantarı, beyaz trüf yağı, parmesan talaşı',
                'allergens' => ['Gluten', 'Süt'],
                'calories' => ['portion' => 810, 'slice' => 202],
                'sizes' => ['small' => 300, 'medium' => 365, 'large' => 435],
                'price' => 365.00,
                'image' => '/images/pizza-funghi.jpg',
                'is_vegetarian' => true,
                'is_active' => true,
            ],
            [
                'category_id' => $catPizzalar->id,
                'name' => 'PROSCIUTTO',
                'description' => 'San Marzano domates, mozzarella, dana jambon, roka, parmesan',
                'ingredients' => 'San Marzano domates, mozzarella, fırın sonrası dana jambon, taze roka, parmesan yaprakları, sızma zeytinyağı',
                'allergens' => ['Gluten', 'Süt'],
                'calories' => ['portion' => 840, 'slice' => 210],
                'sizes' => ['small' => 285, 'medium' => 385, 'large' => 455],
                'price' => 385.00,
                'image' => '/images/pizza-prosciutto.jpg',
                'is_vegetarian' => false,
                'is_active' => true,
            ],
            [
                'category_id' => $catPizzalar->id,
                'name' => 'BURRATA',
                'description' => 'San Marzano domates, burrata, fesleğen, zeytinyağı',
                'ingredients' => 'San Marzano domates sosu, 125g taze burrata peyniri, taze fesleğen, soğuk sıkım sızma zeytinyağı',
                'allergens' => ['Gluten', 'Süt'],
                'calories' => ['portion' => 860, 'slice' => 215],
                'sizes' => ['small' => 320, 'medium' => 395, 'large' => 470],
                'price' => 395.00,
                'image' => '/images/pizza-burrata.jpg',
                'is_vegetarian' => true,
                'is_active' => false, // Tükendi durumunu prototip için simüle ediyoruz
            ],
            [
                'category_id' => $catTatli->id,
                'name' => 'NUTELLA & FINDIK PIZZA',
                'description' => 'Nutella, kavrulmuş fındık parçaları, pudra şekeri',
                'ingredients' => 'Çıtır pizza hamuru, bol nutella, Edirne kavrulmuş dağ fındığı, pudra şekeri',
                'allergens' => ['Gluten', 'Süt', 'Fındık'],
                'calories' => ['portion' => 950, 'slice' => 238],
                'sizes' => ['small' => 190, 'medium' => 240, 'large' => 290],
                'price' => 240.00,
                'image' => '/images/pizza-nutella.jpg',
                'is_vegetarian' => true,
                'is_active' => true,
            ],
            [
                'category_id' => $catSalatalar->id,
                'name' => 'ROKA PARMESAN SALATASI',
                'description' => 'Taze roka, çeri domates, parmesan pulları, nar ekşisi, zeytinyağı',
                'ingredients' => 'Körpe roka yaprakları, kurutulmuş ve çeri domates, parmesan talaşları, ceviz içi, organik nar ekşisi sosu',
                'allergens' => ['Süt', 'Ceviz'],
                'calories' => ['portion' => 340, 'slice' => 170],
                'sizes' => ['medium' => 180],
                'price' => 180.00,
                'image' => '/images/salad-roka-parmesan.jpg',
                'is_vegetarian' => true,
                'is_active' => true,
            ],
            [
                'category_id' => $catIcecekler->id,
                'name' => 'KUTU KOLA 330ML',
                'description' => 'Soğuk kutu kola',
                'ingredients' => 'Kutu kola 330ml',
                'allergens' => [],
                'calories' => ['portion' => 140, 'slice' => 140],
                'sizes' => ['medium' => 60],
                'price' => 60.00,
                'image' => '/images/drink-kola.jpg',
                'is_vegetarian' => true,
                'is_active' => true,
            ],
            [
                'category_id' => $catIcecekler->id,
                'name' => 'EV YAPIMI LİMONATA',
                'description' => 'Taze sıkılmış limon, nane yaprakları, az şekerli',
                'ingredients' => 'Limon suyu, rendelenmiş limon kabuğu, taze nane yaprakları, pancar şekeri',
                'allergens' => [],
                'calories' => ['portion' => 110, 'slice' => 110],
                'sizes' => ['medium' => 75],
                'price' => 75.00,
                'image' => '/images/drink-limonata.jpg',
                'is_vegetarian' => true,
                'is_active' => true,
            ],
            [
                'category_id' => $catIcecekler->id,
                'name' => 'DOĞAL MADEN SUYU',
                'description' => 'Doğal maden suyu 200ml cam şişe',
                'ingredients' => 'Doğal mineralli maden suyu',
                'allergens' => [],
                'calories' => ['portion' => 0, 'slice' => 0],
                'sizes' => ['medium' => 35],
                'price' => 35.00,
                'image' => '/images/drink-madensuyu.jpg',
                'is_vegetarian' => true,
                'is_active' => true,
            ],
        ];

        $createdProducts = [];
        foreach ($productsData as $pd) {
            $createdProducts[$pd['name']] = Product::updateOrCreate(
                ['business_id' => $business->id, 'name' => $pd['name']],
                $pd
            );
        }

        // 6. Reçeteler
        if (isset($createdProducts['MARGHERITA'])) {
            RecipeItem::updateOrCreate(['product_id' => $createdProducts['MARGHERITA']->id, 'raw_material_id' => $hamur->id], ['business_id' => $business->id, 'quantity' => 250]);
            RecipeItem::updateOrCreate(['product_id' => $createdProducts['MARGHERITA']->id, 'raw_material_id' => $peynir->id], ['business_id' => $business->id, 'quantity' => 150]);
            RecipeItem::updateOrCreate(['product_id' => $createdProducts['MARGHERITA']->id, 'raw_material_id' => $sos->id], ['business_id' => $business->id, 'quantity' => 80]);
        }
        if (isset($createdProducts['KUTU KOLA 330ML'])) {
            RecipeItem::updateOrCreate(['product_id' => $createdProducts['KUTU KOLA 330ML']->id, 'raw_material_id' => $kolaStok->id], ['business_id' => $business->id, 'quantity' => 1]);
        }

        // 7. Örnek Masalar ve Siparişler (Panel için hazır canlı ortam)
        // Masa 5: Dolu (₺795 · 45 dk)
        $order5 = Order::updateOrCreate(
            ['business_id' => $business->id, 'table_number' => 'Masa 5', 'status' => 'preparing'],
            ['source' => 'QR', 'total_amount' => 795.00, 'created_at' => now()->subMinutes(45)]
        );
        $order5->items()->delete();
        $order5->items()->create(['product_id' => $createdProducts['MARGHERITA']->id, 'quantity' => 1, 'size' => 'Orta', 'price' => 320.00]);
        $order5->items()->create(['product_id' => $createdProducts['PROSCIUTTO']->id, 'quantity' => 1, 'size' => 'Orta', 'price' => 385.00]);
        $order5->items()->create(['product_id' => $createdProducts['KUTU KOLA 330ML']->id, 'quantity' => 1, 'size' => 'Orta', 'price' => 60.00]);
        $order5->items()->create(['product_id' => $createdProducts['DOĞAL MADEN SUYU']->id, 'quantity' => 1, 'size' => 'Orta', 'price' => 30.00]);

        // Masa 3: İlgilen (Yeni Sipariş bekliyor)
        $order3 = Order::updateOrCreate(
            ['business_id' => $business->id, 'table_number' => 'Masa 3', 'status' => 'pending'],
            ['source' => 'QR', 'total_amount' => 415.00, 'created_at' => now()->subMinutes(4)]
        );
        $order3->items()->delete();
        $order3->items()->create(['product_id' => $createdProducts['DIAVOLA']->id, 'quantity' => 1, 'size' => 'Orta', 'price' => 355.00]);
        $order3->items()->create(['product_id' => $createdProducts['KUTU KOLA 330ML']->id, 'quantity' => 1, 'size' => 'Orta', 'price' => 60.00]);

        // Garson Çağrısı: Bahçe 2 (Hesap istiyor)
        WaiterCall::updateOrCreate(
            ['business_id' => $business->id, 'table_number' => 'Bahçe 2', 'status' => 'pending'],
            ['reason' => 'Hesabı istiyorum']
        );
    }
}