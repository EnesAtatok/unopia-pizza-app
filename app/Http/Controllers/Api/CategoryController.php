<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Support\Translations;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    private const FIELDS = ['name' => 40];

    public function index()
    {
        $categories = Category::orderBy('sort_order')->get();

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
     * Panel menü yönetimi: yeni kategori
     */
    public function store(Request $request)
    {
        $businessId = $request->user()?->business_id ?? 1;

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:40',
                Rule::unique('categories')->where('business_id', $businessId),
            ],
        ] + Translations::rules(self::FIELDS), ['name.unique' => 'Bu kategori zaten var.']);

        $category = Category::create([
            'business_id' => $businessId,
            'name' => trim($data['name']),
            'translations' => Translations::clean($data['translations'] ?? null, self::FIELDS),
            'sort_order' => (Category::where('business_id', $businessId)->max('sort_order') ?? 0) + 1,
        ]);

        return response()->json(['success' => true, 'data' => $category], 201);
    }

    /**
     * Panel: kategori adı ve çevirileri
     */
    public function update(Request $request, int $id)
    {
        $category = $this->findOwned($request, $id);

        $data = $request->validate([
            'name' => [
                'sometimes', 'required', 'string', 'max:40',
                Rule::unique('categories')->where('business_id', $category->business_id)->ignore($category->id),
            ],
        ] + Translations::rules(self::FIELDS), ['name.unique' => 'Bu kategori zaten var.']);

        if (isset($data['name'])) {
            $category->name = trim($data['name']);
        }
        if ($request->has('translations')) {
            $category->translations = Translations::clean($data['translations'] ?? null, self::FIELDS);
        }
        $category->save();

        return response()->json(['success' => true, 'data' => $category]);
    }

    /**
     * Panel: kategoriyi sil. İçinde ürün (gizliler dahil) varsa silinmez: veritabanında ürünler
     * kategoriye bağlıdır, silme ürünleri de götürürdü.
     */
    public function destroy(Request $request, int $id)
    {
        $category = $this->findOwned($request, $id);
        $count = $category->products()->count();

        if ($count > 0) {
            return response()->json([
                'success' => false,
                'message' => "\"{$category->name}\" kategorisinde {$count} ürün var (menüden kaldırılmış ürünler dahil). "
                    . 'Silmeden önce ürünleri Düzenle ile başka bir kategoriye taşıyın.',
            ], 409);
        }

        $category->delete();

        return response()->json(['success' => true, 'message' => "\"{$category->name}\" kategorisi silindi."]);
    }

    private function findOwned(Request $request, int $id): Category
    {
        return Category::where('business_id', $request->user()?->business_id ?? 1)->findOrFail($id);
    }
}
