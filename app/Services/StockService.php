<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

class StockService
{
    /**
     * Satılan ürünün reçetesine göre hammaddeleri stoktan düşer.
     */
    public function deductForSale(Product $product, int $quantity = 1, ?int $userId = null, string $description = 'Adisyon satışı')
    {
        // DB::transaction: İşlem sırasında elektrik kesilirse veya hata çıkarsa yarım yamalak düşüm yapmayı engeller.
        DB::transaction(function () use ($product, $quantity, $userId, $description) {
            
            // Ürünün reçete kalemlerini ve bağlı olduğu hammaddeleri çek
            $recipeItems = $product->recipeItems()->with('rawMaterial')->get();

            foreach ($recipeItems as $item) {
                // Toplam düşülecek miktar (Örn: 2 adet margarita ise 250g x 2 = 500g hamur)
                $totalDeducted = $item->quantity * $quantity;

                // 1. Stok hareket defterine çıkış kaydı ekle (Değer eksi olmalı)
                StockMovement::create([
                    'business_id' => $product->business_id,
                    'raw_material_id' => $item->raw_material_id,
                    'type' => 'sale',
                    'quantity' => -$totalDeducted, // Stoktan çıktığı için negatif
                    'description' => $quantity . 'x ' . $product->name . ' satışı - ' . $description,
                    'user_id' => $userId,
                ]);

                // 2. Performans için RawMaterial tablosundaki anlık stok (cache) bilgisini güncelle
                $item->rawMaterial->decrement('current_stock', $totalDeducted);
            }
            
        });
    }
}