<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        // İleride auth yapıldığında sadece o işletmenin kategorilerini çekeceğiz
        // Şimdilik test için tümünü çekiyoruz
        $categories = Category::orderBy('sort_order')->get();
        
        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }
}
