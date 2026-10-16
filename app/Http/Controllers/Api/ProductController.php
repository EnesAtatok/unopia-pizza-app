<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\Translations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    // QR menüde çevrilebilen alanlar ve en fazla uzunlukları (Türkçe alanlarla aynı)
    private const TRANSLATED_FIELDS = ['name' => 80, 'description' => 255, 'ingredients' => 500, 'chef_note' => 160];

    /**
     * Müşteri menüsü: menüden kaldırılmamış ürünler (tükenenler dahil, "Tükendi" olarak gösterilir)
     */
    public function index()
    {
        $products = Product::with('category')
            ->where('is_visible', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['success' => true, 'data' => $products]);
    }

    /**
     * Panel menü yönetimi: menüden kaldırılanlar dahil tüm ürünler
     */
    public function panelIndex(Request $request)
    {
        $products = Product::with('category')
            ->where('business_id', $request->user()?->business_id ?? 1)
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['success' => true, 'data' => $products]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['business_id'] = $request->user()?->business_id ?? 1;

        $product = Product::create($data);
        $this->storeImage($request, $product);

        return response()->json(['success' => true, 'data' => $product->fresh('category')], 201);
    }

    public function update(Request $request, int $id)
    {
        $product = $this->findOwned($request, $id);

        $product->update($this->validated($request));
        $this->storeImage($request, $product);

        return response()->json(['success' => true, 'data' => $product->fresh('category')]);
    }

    /**
     * Tükendi / Satışta
     */
    public function setAvailability(Request $request, int $id)
    {
        $product = $this->findOwned($request, $id);
        $product->update($request->validate(['is_active' => 'required|boolean']));

        return response()->json(['success' => true, 'data' => $product]);
    }

    /**
     * Menüde göster / menüden kaldır (geçici; kalıcı silme için destroy)
     */
    public function setVisibility(Request $request, int $id)
    {
        $product = $this->findOwned($request, $id);
        $product->update($request->validate(['is_visible' => 'required|boolean']));

        return response()->json(['success' => true, 'data' => $product]);
    }

    /**
     * Ürünü kalıcı olarak sil (yüklenmiş fotoğrafı da silinir).
     * Geçici olarak kaldırmak için Gizle kullanılır.
     */
    public function destroy(Request $request, int $id)
    {
        $product = $this->findOwned($request, $id);
        $image = $product->image;

        $product->delete();

        if ($image && str_starts_with($image, '/images/products/')) {
            File::delete(public_path(ltrim($image, '/')));
        }

        return response()->json(['success' => true, 'message' => "\"{$product->name}\" silindi."]);
    }

    /**
     * Toplu fiyat güncelleme: seçili ürünlerin taban ve boy fiyatlarına yüzde veya TL olarak zam / indirim.
     * Sonuç tam TL'ye yuvarlanır; herhangi bir fiyat 0 veya altına düşecekse hiçbiri değişmez.
     */
    public function bulkPrice(Request $request)
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'mode' => 'required|in:percent,amount',
            'direction' => 'required|in:increase,decrease',
            'value' => 'required|numeric|gt:0|max:100000',
        ], [
            'ids.required' => 'Fiyatı güncellenecek ürünleri seçin.',
            'value.gt' => "Değer 0'dan büyük olmalı.",
        ]);

        $sign = $data['direction'] === 'increase' ? 1 : -1;
        $value = (float) $data['value'];
        $adjust = fn ($price) => round($data['mode'] === 'percent'
            ? (float) $price * (1 + $sign * $value / 100)
            : (float) $price + $sign * $value);

        $products = Product::where('business_id', $request->user()?->business_id ?? 1)
            ->whereIn('id', $data['ids'])
            ->get();

        $changes = [];
        foreach ($products as $product) {
            $sizes = is_array($product->sizes)
                ? array_map(fn ($v) => $v === null || $v === '' ? $v : $adjust($v), $product->sizes)
                : $product->sizes;
            $price = $adjust($product->price);

            $prices = array_merge([$price], is_array($sizes) ? array_filter($sizes, fn ($v) => $v !== null && $v !== '') : []);
            if (min($prices) <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => "{$product->name} ürününün fiyatı 0 TL veya altına düşüyor. Daha küçük bir indirim girin.",
                ], 422);
            }

            $changes[] = [$product, ['price' => $price, 'sizes' => $sizes]];
        }

        DB::transaction(function () use ($changes) {
            foreach ($changes as [$product, $attrs]) {
                $product->update($attrs);
            }
        });

        return response()->json(['success' => true, 'data' => $products->map->fresh('category')]);
    }

    private function validated(Request $request): array
    {
        // multipart/form-data ile gelen alanlar string olur; JSON alanlarını çöz
        foreach (['sizes', 'piece_counts', 'calories', 'allergens', 'translations'] as $jsonField) {
            if (is_string($request->input($jsonField))) {
                $request->merge([$jsonField => json_decode($request->input($jsonField), true)]);
            }
        }

        $data = $request->validate([
            'category_id' => 'required|integer|exists:categories,id',
            'name' => 'required|string|max:80',
            'description' => 'nullable|string|max:255',
            'ingredients' => 'nullable|string|max:500',
            'chef_note' => 'nullable|string|max:160',
            'price' => 'required|numeric|min:0|max:100000',
            'sizes' => 'nullable|array',
            'sizes.small' => 'nullable|numeric|min:0|max:100000',
            'sizes.medium' => 'nullable|numeric|min:0|max:100000',
            'sizes.large' => 'nullable|numeric|min:0|max:100000',
            // Adete göre fiyat: aynı yuvaların adedi (4'lü, 6'lı)
            'piece_counts' => 'nullable|array',
            'piece_counts.small' => 'nullable|integer|min:1|max:999',
            'piece_counts.medium' => 'nullable|integer|min:1|max:999',
            'piece_counts.large' => 'nullable|integer|min:1|max:999',
            'allergens' => 'nullable|array',
            'allergens.*' => 'string|max:30',
            'calories' => 'nullable|array',
            'calories.portion' => 'nullable|integer|min:0',
            'calories.slice' => 'nullable|integer|min:0',
            'is_vegetarian' => 'nullable|boolean',
            'has_extras' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ] + Translations::rules(self::TRANSLATED_FIELDS), [
            'image.max' => 'Fotoğraf en fazla 5 MB olabilir.',
            'image.image' => 'Yüklenen dosya bir fotoğraf olmalı.',
            'image.uploaded' => 'Fotoğraf yüklenemedi (sunucunun dosya boyutu sınırını aşıyor olabilir). Daha küçük bir fotoğraf deneyin.',
        ]);

        unset($data['image']);

        // QR menü çevirileri: boş alanlar atılır, hiç çeviri yoksa null (müşteriye Türkçe gösterilir)
        if ($request->has('translations')) {
            $data['translations'] = Translations::clean($data['translations'] ?? null, self::TRANSLATED_FIELDS);
        }

        // Kısa açıklama (menü kartı) her zaman malzemelerle aynıdır; çevirilerde de
        if (array_key_exists('ingredients', $data)) {
            $ingredients = trim((string) $data['ingredients']) ?: null;
            $data['ingredients'] = $ingredients;
            $data['description'] = $ingredients === null ? null : mb_substr($ingredients, 0, 255);

            foreach ($data['translations'] ?? [] as $locale => $fields) {
                unset($data['translations'][$locale]['description']);
                if (!empty($fields['ingredients'])) {
                    $data['translations'][$locale]['description'] = mb_substr($fields['ingredients'], 0, 255);
                }
            }
        }

        // Boş boy fiyatlarını at; orta boy yoksa taban fiyatı kullan
        if (isset($data['sizes'])) {
            $data['sizes'] = array_filter($data['sizes'], fn ($v) => $v !== null && $v !== '');
            $data['sizes'] = $data['sizes'] ?: null;
        }
        // Adet yalnızca fiyatı girilmiş yuvalarda tutulur; hiç yoksa ürün boy ile fiyatlanır
        if ($request->has('piece_counts')) {
            $counts = array_filter($data['piece_counts'] ?? [], fn ($v) => $v !== null && $v !== '');
            $counts = array_intersect_key($counts, $data['sizes'] ?? []);
            $data['piece_counts'] = $counts ? array_map('intval', $counts) : null;
        }
        if (isset($data['calories'])) {
            $data['calories'] = array_filter($data['calories'], fn ($v) => $v !== null && $v !== '') ?: null;
        }

        return $data;
    }

    /**
     * Fotoğrafı public/images/products altına kaydeder (storage:link gerektirmez)
     */
    private function storeImage(Request $request, Product $product): void
    {
        if (!$request->hasFile('image')) {
            return;
        }

        $dir = public_path('images/products');
        File::ensureDirectoryExists($dir);

        $file = $request->file('image');
        $name = Str::slug($product->name) . '-' . Str::lower(Str::random(6)) . '.' . $file->extension();
        $file->move($dir, $name);

        // Eski yüklenmiş fotoğrafı temizle (yalnızca bu klasördekiler)
        if ($product->image && str_starts_with($product->image, '/images/products/')) {
            File::delete(public_path(ltrim($product->image, '/')));
        }

        $product->update(['image' => '/images/products/' . $name]);
    }

    private function findOwned(Request $request, int $id): Product
    {
        return Product::where('business_id', $request->user()?->business_id ?? 1)->findOrFail($id);
    }
}
