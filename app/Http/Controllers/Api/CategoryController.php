<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
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
        $businessId = $request->user()->business_id ?? 1;

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:40',
                Rule::unique('categories')->where('business_id', $businessId),
            ],
        ], ['name.unique' => 'Bu kategori zaten var.']);

        $category = Category::create([
            'business_id' => $businessId,
            'name' => trim($data['name']),
            'sort_order' => (Category::where('business_id', $businessId)->max('sort_order') ?? 0) + 1,
        ]);

        return response()->json(['success' => true, 'data' => $category], 201);
    }
}
