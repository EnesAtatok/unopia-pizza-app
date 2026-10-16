<?php

namespace Database\Seeders;

use App\Models\Business;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Yeni kurulum: işletme kaydı ve basılı menüdeki ürünler.
     */
    public function run(): void
    {
        Business::firstOrCreate(['id' => 1], ['name' => 'Unopia Pizza Edirne', 'is_active' => true]);

        $this->call(MenuImportSeeder::class);
    }
}
