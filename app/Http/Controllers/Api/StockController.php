<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\RecipeItem;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Stok ve reçete: gramaj bazlı hammadde, alış, fire.
 * Tüm miktarlar hammaddenin temel biriminde tutulur (g, ml, adet).
 */
class StockController extends Controller
{
    // Stok 3 ondalıkla (decimal 12,3) tutulur: daha küçük miktar 0'a yuvarlanır, daha büyüğü sütuna sığmaz
    private const MIN_QTY = 0.001;
    private const MAX_QTY = 999999999;

    public function __construct(private StockService $stock)
    {
    }

    public function index(Request $request)
    {
        $materials = RawMaterial::where('business_id', $this->businessId($request))
            ->orderBy('name')
            ->get()
            ->map(fn (RawMaterial $m) => $this->present($m));

        return response()->json(['success' => true, 'data' => $materials]);
    }

    public function store(Request $request)
    {
        $businessId = $this->businessId($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('raw_materials')->where('business_id', $businessId)],
            'base_unit' => 'required|in:g,ml,adet',
            'critical_level' => 'nullable|numeric|min:0|max:' . self::MAX_QTY,
        ], ['name.unique' => 'Bu hammadde zaten var.']);

        $material = RawMaterial::create($data + ['business_id' => $businessId, 'current_stock' => 0]);

        return response()->json(['success' => true, 'data' => $this->present($material)], 201);
    }

    /**
     * Alış: stok artar, ortalama birim maliyet ağırlıklı olarak güncellenir.
     */
    public function purchase(Request $request, int $id)
    {
        $material = $this->findOwned($request, $id);

        $data = $request->validate([
            'quantity' => 'required|numeric|min:' . self::MIN_QTY . '|max:' . self::MAX_QTY,
            'total_cost' => 'nullable|numeric|min:0|max:' . self::MAX_QTY,
            'description' => 'nullable|string|max:150',
        ]);

        DB::transaction(function () use (&$material, $data, $request) {
            // Satır kilidi: aynı anda girilen iki alıştan biri kaybolmasın
            $material = RawMaterial::lockForUpdate()->find($material->id);
            $qty = (float) $data['quantity'];
            abort_if((float) $material->current_stock + $qty > self::MAX_QTY, 422, 'Toplam stok çok büyük; miktarı kontrol edin.');
            $oldStock = max(0, (float) $material->current_stock);

            if (!empty($data['total_cost'])) {
                $newUnitCost = (float) $data['total_cost'] / $qty;
                $avg = $oldStock + $qty > 0
                    ? (($oldStock * (float) $material->average_cost) + ($qty * $newUnitCost)) / ($oldStock + $qty)
                    : $newUnitCost;
                $material->average_cost = $avg;
            }

            $material->current_stock = (float) $material->current_stock + $qty;
            $material->save();

            $cost = !empty($data['total_cost']) ? (float) $data['total_cost'] : null;
            $this->log($material, 'purchase', $qty, $data['description'] ?? 'Alış', $request->user()->id, $cost);
        });
        $this->stock->refreshAvailability([$material->id]);

        return response()->json(['success' => true, 'data' => $this->present($material->fresh())]);
    }

    /**
     * Fire: dökülen, bozulan, atılan hammadde
     */
    public function waste(Request $request, int $id)
    {
        $material = $this->findOwned($request, $id);

        $data = $request->validate([
            'quantity' => 'required|numeric|min:' . self::MIN_QTY . '|max:' . self::MAX_QTY,
            'description' => 'nullable|string|max:150',
        ]);

        $ok = DB::transaction(function () use ($material, $data, $request) {
            $locked = RawMaterial::lockForUpdate()->find($material->id);
            if ((float) $data['quantity'] > (float) $locked->current_stock + 0.0005) {
                return false;
            }
            $locked->decrement('current_stock', $data['quantity']);
            $this->log($locked, 'waste', -(float) $data['quantity'], $data['description'] ?? 'Fire', $request->user()->id);

            return true;
        });

        if (!$ok) {
            return response()->json([
                'success' => false,
                'message' => sprintf('Fire miktarı mevcut stoktan (%s %s) fazla olamaz.', (float) $material->fresh()->current_stock, $material->base_unit),
            ], 422);
        }
        $this->stock->refreshAvailability([$material->id]);

        return response()->json(['success' => true, 'data' => $this->present($material->fresh())]);
    }

    public function movements(Request $request, int $id)
    {
        $material = $this->findOwned($request, $id);

        $movements = StockMovement::with('user:id,name')
            ->where('raw_material_id', $material->id)
            ->latest()
            ->limit(30)
            ->get();

        return response()->json(['success' => true, 'data' => $movements]);
    }

    /**
     * Ürün reçetesi: 1 adet ürün için kullanılan hammadde miktarları
     */
    public function recipe(Request $request, int $productId)
    {
        $product = Product::where('business_id', $this->businessId($request))->findOrFail($productId);

        $items = RecipeItem::with('rawMaterial:id,name,base_unit')
            ->where('product_id', $product->id)
            ->get()
            ->map(fn ($r) => [
                'raw_material_id' => $r->raw_material_id,
                'name' => $r->rawMaterial?->name,
                'base_unit' => $r->rawMaterial?->base_unit,
                'quantity' => (float) $r->quantity,
            ]);

        return response()->json(['success' => true, 'data' => $items]);
    }

    public function saveRecipe(Request $request, int $productId)
    {
        $businessId = $this->businessId($request);
        $product = Product::where('business_id', $businessId)->findOrFail($productId);

        $data = $request->validate([
            'items' => 'present|array',
            'items.*.raw_material_id' => 'required|integer|exists:raw_materials,id|distinct',
            'items.*.quantity' => 'required|numeric|min:' . self::MIN_QTY . '|max:' . self::MAX_QTY,
        ], [
            'items.*.raw_material_id.distinct' => 'Aynı hammadde reçetede iki kez olamaz.',
        ]);

        DB::transaction(function () use ($product, $data, $businessId) {
            RecipeItem::where('product_id', $product->id)->delete();
            foreach ($data['items'] as $item) {
                RecipeItem::create([
                    'business_id' => $businessId,
                    'product_id' => $product->id,
                    'raw_material_id' => $item['raw_material_id'],
                    'quantity' => $item['quantity'],
                ]);
            }
        });
        $this->stock->refreshAvailability(array_column($data['items'], 'raw_material_id'));

        return $this->recipe($request, $productId);
    }

    private function present(RawMaterial $m): array
    {
        $critical = (float) $m->critical_level;

        return [
            'id' => $m->id,
            'name' => $m->name,
            'base_unit' => $m->base_unit,
            'current_stock' => (float) $m->current_stock,
            'critical_level' => $critical,
            'average_cost' => (float) $m->average_cost,
            'is_critical' => $critical > 0 && (float) $m->current_stock <= $critical,
            // Stok bitti: bu hammaddeyi kullanan ürünler sipariş edilemez
            'is_out' => (float) $m->current_stock <= 0.0005,
        ];
    }

    private function log(RawMaterial $material, string $type, float $qty, string $description, ?int $userId, ?float $totalCost = null): void
    {
        StockMovement::create([
            'business_id' => $material->business_id,
            'raw_material_id' => $material->id,
            'type' => $type,
            'quantity' => $qty,
            'total_cost' => $totalCost,
            'description' => $description,
            'user_id' => $userId,
        ]);
    }

    private function businessId(Request $request): int
    {
        return $request->user()->business_id ?? 1;
    }

    private function findOwned(Request $request, int $id): RawMaterial
    {
        return RawMaterial::where('business_id', $this->businessId($request))->findOrFail($id);
    }
}
