<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\RestaurantTable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TableController extends Controller
{
    /**
     * Müşteri: QR koddaki token'dan masayı bulur (herkese açık)
     */
    public function resolve(string $token)
    {
        $table = RestaurantTable::findActiveByToken($token);

        if (!$table) {
            return response()->json([
                'success' => false,
                'message' => 'Bu QR kod geçersiz veya artık kullanılmıyor. Lütfen personelden yardım isteyin.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'name' => $table->name,
                'section' => $table->section,
            ],
        ]);
    }

    /**
     * Panel: tüm masalar ve QR linkleri
     */
    public function index(Request $request)
    {
        $tables = RestaurantTable::where('business_id', $this->businessId($request))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (RestaurantTable $t) => $this->present($t));

        return response()->json(['success' => true, 'data' => $tables]);
    }

    /**
     * Panel: yeni masa ekle (QR token otomatik üretilir)
     */
    public function store(Request $request)
    {
        $businessId = $this->businessId($request);

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:50',
                Rule::unique('restaurant_tables')->where('business_id', $businessId),
            ],
            'section' => 'required|in:salon,bahce',
        ], [
            'name.unique' => 'Bu isimde bir masa zaten var.',
        ]);

        $table = RestaurantTable::create([
            'business_id' => $businessId,
            'name' => trim($data['name']),
            'section' => $data['section'],
            'sort_order' => (RestaurantTable::where('business_id', $businessId)->max('sort_order') ?? 0) + 1,
        ]);

        return response()->json(['success' => true, 'data' => $this->present($table)], 201);
    }

    /**
     * Panel: masayı aktif/pasif yap (pasif masanın QR kodu çalışmaz)
     */
    public function update(Request $request, int $id)
    {
        $table = $this->findOwned($request, $id);
        $data = $request->validate(['is_active' => 'required|boolean']);

        // Açık hesabı olan masa pasif yapılırsa panelden kaybolur ve hesap kapatılamaz
        if (!$data['is_active'] && Order::where('table_number', $table->name)->whereIn('status', Order::OPEN_STATUSES)->exists()) {
            return response()->json([
                'success' => false,
                'message' => "{$table->name} masasında açık hesap var. Önce hesabı kapatın ya da masayı taşıyın.",
            ], 409);
        }

        $table->update($data);

        return response()->json(['success' => true, 'data' => $this->present($table)]);
    }

    /**
     * Panel: QR kodu yenile. Eski basılı QR kod anında geçersiz olur.
     */
    public function regenerate(Request $request, int $id)
    {
        $table = $this->findOwned($request, $id);

        $table->update(['qr_token' => RestaurantTable::generateToken()]);

        return response()->json(['success' => true, 'data' => $this->present($table)]);
    }

    private function present(RestaurantTable $table): array
    {
        return [
            'id' => $table->id,
            'name' => $table->name,
            'section' => $table->section,
            'is_active' => $table->is_active,
            'qr_url' => $table->qr_url,
        ];
    }

    private function businessId(Request $request): int
    {
        return $request->user()->business_id ?? 1;
    }

    private function findOwned(Request $request, int $id): RestaurantTable
    {
        return RestaurantTable::where('business_id', $this->businessId($request))->findOrFail($id);
    }
}
