<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        // 'with' kullanarak ürünlerle beraber kategori bilgisini de tek sorguda çekiyoruz (Performans için)
        $products = Product::with('category')->where('is_active', true)->get();
        
        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }
}
