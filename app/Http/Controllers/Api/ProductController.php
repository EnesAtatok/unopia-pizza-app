<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ProductController extends Controller
{
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
            ->where('business_id', $request->user()->business_id ?? 1)
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['success' => true, 'data' => $products]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['business_id'] = $request->user()->business_id ?? 1;

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
        // Elle işaretleme otomatik stok kararını geçersiz kılar
        $product->update($request->validate(['is_active' => 'required|boolean']) + ['auto_sold_out' => false]);

        return response()->json(['success' => true, 'data' => $product]);
    }

    /**
     * Menüde göster / menüden kaldır (geçmiş adisyonlar bozulmasın diye silinmez)
     */
    public function setVisibility(Request $request, int $id)
    {
        $product = $this->findOwned($request, $id);
        $product->update($request->validate(['is_visible' => 'required|boolean']));

        return response()->json(['success' => true, 'data' => $product]);
    }

    private function validated(Request $request): array
    {
        // multipart/form-data ile gelen alanlar string olur; JSON alanlarını çöz
        foreach (['sizes', 'calories', 'allergens'] as $jsonField) {
            if (is_string($request->input($jsonField))) {
                $request->merge([$jsonField => json_decode($request->input($jsonField), true)]);
            }
        }

        $data = $request->validate([
            'category_id' => 'required|integer|exists:categories,id',
            'name' => 'required|string|max:80',
            'description' => 'nullable|string|max:255',
            'ingredients' => 'nullable|string|max:500',
            'price' => 'required|numeric|min:0|max:100000',
            'sizes' => 'nullable|array',
            'sizes.small' => 'nullable|numeric|min:0|max:100000',
            'sizes.medium' => 'nullable|numeric|min:0|max:100000',
            'sizes.large' => 'nullable|numeric|min:0|max:100000',
            'allergens' => 'nullable|array',
            'allergens.*' => 'string|max:30',
            'calories' => 'nullable|array',
            'calories.portion' => 'nullable|integer|min:0',
            'calories.slice' => 'nullable|integer|min:0',
            'is_vegetarian' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            'image.max' => 'Fotoğraf en fazla 5 MB olabilir.',
            'image.image' => 'Yüklenen dosya bir fotoğraf olmalı.',
        ]);

        unset($data['image']);

        // Boş boy fiyatlarını at; orta boy yoksa taban fiyatı kullan
        if (isset($data['sizes'])) {
            $data['sizes'] = array_filter($data['sizes'], fn ($v) => $v !== null && $v !== '');
            $data['sizes'] = $data['sizes'] ?: null;
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
        return Product::where('business_id', $request->user()->business_id ?? 1)->findOrFail($id);
    }
}
