<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Order;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\RecipeItem;
use App\Models\StockMovement;

class StockService
{
    /**
     * Siparişin tüm kalemleri için gereken hammadde miktarları: [raw_material_id => miktar].
     * Reçete Orta boy içindir; boy çarpanı uygulanır.
     *
     * @param  iterable<array{product: Product, quantity: int, size: ?string}>  $lines
     */
    public function requirements(iterable $lines): array
    {
        $needs = [];
        foreach ($lines as $line) {
            $product = $line['product'];
            $factor = $product->stockFactorForSize($line['size']);
            foreach ($product->recipeItems as $item) {
                $needs[$item->raw_material_id] = ($needs[$item->raw_material_id] ?? 0)
                    + (float) $item->quantity * $line['quantity'] * $factor;
            }
        }

        return $needs;
    }

    /**
     * Kilitsiz ön kontrol (müşteri siparişi gönderirken): yetmeyen hammaddelerin adları.
     */
    public function shortages(iterable $lines): array
    {
        $needs = $this->requirements($lines);
        if (!$needs) {
            return [];
        }

        return RawMaterial::whereIn('id', array_keys($needs))->get()
            ->filter(fn ($m) => (float) $m->current_stock + 0.0005 < $needs[$m->id])
            ->pluck('name')->all();
    }

    /**
     * Sipariş onaylanınca / personel ekleyince stok düşer. Transaction içinde çağrılmalıdır:
     * hammadde satırları kilitlenir, yetmiyorsa hiçbir şey düşmez ve istisna fırlatılır (stok eksiye inmez).
     */
    public function deductForOrder(Order $order, ?int $userId = null): void
    {
        $items = $order->items()->with('product.recipeItems')->get()->filter(fn ($i) => $i->product);
        $lines = $items->map(fn ($i) => ['product' => $i->product, 'quantity' => (int) $i->quantity, 'size' => $i->size]);

        $needs = $this->requirements($lines);
        if (!$needs) {
            return;
        }

        $materials = RawMaterial::whereIn('id', array_keys($needs))->orderBy('id')->lockForUpdate()->get()->keyBy('id');

        $short = $materials->filter(fn ($m) => (float) $m->current_stock + 0.0005 < $needs[$m->id]);
        if ($short->isNotEmpty()) {
            throw new InsufficientStockException($short->map(fn ($m) => sprintf(
                '%s (gereken %s, kalan %s %s)',
                $m->name,
                $this->fmt($needs[$m->id]),
                $this->fmt((float) $m->current_stock),
                $m->base_unit
            ))->values()->all());
        }

        $now = now();
        $movements = [];
        foreach ($items as $item) {
            $factor = $item->product->stockFactorForSize($item->size);
            foreach ($item->product->recipeItems as $recipe) {
                $movements[] = [
                    'business_id' => $item->product->business_id,
                    'raw_material_id' => $recipe->raw_material_id,
                    'type' => 'sale',
                    'quantity' => -((float) $recipe->quantity * $item->quantity * $factor),
                    'description' => sprintf('%dx %s (%s) satışı - Sipariş No: %d', $item->quantity, $item->product->name, $item->size, $order->id),
                    'user_id' => $userId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        foreach ($needs as $materialId => $amount) {
            $materials[$materialId]->decrement('current_stock', $amount);
        }
        StockMovement::insert($movements);

        $this->refreshAvailability(array_keys($needs));
    }

    /**
     * Hammadde değişince ilgili ürünlerin satış durumunu günceller:
     * en küçük boyu bile yapılamayan ürün otomatik "Tükendi" olur; stok yeniden yetince
     * yalnızca otomatik kapatılmış ürünler geri açılır (elle Tükendi yapılanlara dokunulmaz).
     */
    public function refreshAvailability(array $rawMaterialIds): void
    {
        $productIds = RecipeItem::whereIn('raw_material_id', $rawMaterialIds)->distinct()->pluck('product_id');

        foreach (Product::with('recipeItems.rawMaterial')->whereIn('id', $productIds)->get() as $product) {
            $factor = $product->minStockFactor();
            $canMake = $product->recipeItems->every(
                fn ($r) => !$r->rawMaterial || (float) $r->rawMaterial->current_stock + 0.0005 >= (float) $r->quantity * $factor
            );

            if (!$canMake && $product->is_active) {
                $product->update(['is_active' => false, 'auto_sold_out' => true]);
            } elseif ($canMake && !$product->is_active && $product->auto_sold_out) {
                $product->update(['is_active' => true, 'auto_sold_out' => false]);
            }
        }
    }

    private function fmt(float $v): string
    {
        return rtrim(rtrim(number_format($v, 3, ',', '.'), '0'), ',');
    }
}
