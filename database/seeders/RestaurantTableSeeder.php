<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Business;
use App\Models\RestaurantTable;

class RestaurantTableSeeder extends Seeder
{
    /**
     * Salon (Masa 1-10) ve Bahçe (Bahçe 1-6) masalarını oluşturur.
     * Mevcut masaların QR token'larına dokunmaz; tekrar çalıştırmak güvenlidir.
     */
    public function run(): void
    {
        $business = Business::firstOrCreate(
            ['id' => 1],
            ['name' => 'Unopia Pizza Edirne', 'is_active' => true]
        );

        $order = 0;
        foreach (range(1, 10) as $n) {
            RestaurantTable::firstOrCreate(
                ['business_id' => $business->id, 'name' => "Masa $n"],
                ['section' => 'salon', 'sort_order' => ++$order]
            );
        }
        foreach (range(1, 6) as $n) {
            RestaurantTable::firstOrCreate(
                ['business_id' => $business->id, 'name' => "Bahçe $n"],
                ['section' => 'bahce', 'sort_order' => ++$order]
            );
        }
    }
}
