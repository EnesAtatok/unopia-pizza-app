<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Extra;
use App\Support\Translations;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExtraController extends Controller
{
    private const FIELDS = ['name' => 60];

    /**
     * QR menü: aktif ilaveler (ilaveler açık ürünlerin detayında gösterilir)
     */
    public function index()
    {
        $extras = Extra::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['success' => true, 'data' => $extras]);
    }

    /**
     * Panel: pasifler dahil tüm ilaveler
     */
    public function panelIndex(Request $request)
    {
        $extras = Extra::where('business_id', $this->businessId($request))->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['success' => true, 'data' => $extras]);
    }

    public function store(Request $request)
    {
        $businessId = $this->businessId($request);
        $data = $this->validated($request, $businessId);

        $extra = Extra::create($data + [
            'business_id' => $businessId,
            'sort_order' => (Extra::where('business_id', $businessId)->max('sort_order') ?? 0) + 1,
        ]);

        return response()->json(['success' => true, 'data' => $extra->fresh()], 201);
    }

    public function update(Request $request, int $id)
    {
        $extra = $this->findOwned($request, $id);
        $extra->update($this->validated($request, $extra->business_id, $extra));

        return response()->json(['success' => true, 'data' => $extra->fresh()]);
    }

    public function destroy(Request $request, int $id)
    {
        $this->findOwned($request, $id)->delete();

        return response()->json(['success' => true]);
    }

    private function validated(Request $request, int $businessId, ?Extra $extra = null): array
    {
        $required = $extra ? 'sometimes|required' : 'required';
        $unique = Rule::unique('extras')->where('business_id', $businessId);

        $data = $request->validate([
            'name' => [...explode('|', $required), 'string', 'max:60', $extra ? $unique->ignore($extra->id) : $unique],
            'price' => "$required|numeric|gt:0|max:100000",
            'is_active' => 'sometimes|boolean',
        ] + Translations::rules(self::FIELDS), [
            'name.unique' => 'Bu isimde bir ilave zaten var.',
            'price.gt' => "Birim fiyat 0'dan büyük olmalı.",
        ]);

        if (isset($data['name'])) {
            $data['name'] = trim($data['name']);
        }
        if ($request->has('translations')) {
            $data['translations'] = Translations::clean($data['translations'] ?? null, self::FIELDS);
        }

        return $data;
    }

    private function businessId(Request $request): int
    {
        return $request->user()?->business_id ?? 1;
    }

    private function findOwned(Request $request, int $id): Extra
    {
        return Extra::where('business_id', $this->businessId($request))->findOrFail($id);
    }
}
