<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Services\StockService;
use App\Events\OrderCreated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function store(Request $request, StockService $stockService)
    {
        // DB::transaction ile bir hata çıkarsa işlemlerin (sipariş, stok vb.) geri alınmasını sağlıyoruz
        return DB::transaction(function () use ($request, $stockService) {
            $businessId = $request->input('business_id', 1); // Test için varsayılan 1
            
            // 1. Ana Siparişi (Fiş Başlığını) Oluştur
            $order = Order::create([
                'business_id' => $businessId,
                'table_number' => $request->input('table_number'),
                'status' => 'pending',
                'total_amount' => 0, // Birazdan kalemleri toplayıp güncelleyeceğiz
            ]);

            $totalAmount = 0;

            // 2. Sipariş Kalemlerini Döngüye Sok ve Stokları Düş
            foreach ($request->input('items', []) as $item) {
                $product = Product::findOrFail($item['product_id']);
                $quantity = $item['quantity'];
                
                $totalAmount += ($product->price * $quantity);

                // Fişin içeriğini (Margarita, Kola vb.) kaydet
                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price' => $product->price,
                ]);

                // Az önce yazdığımız Stok Servisi'ni çağırıp reçetedeki hammaddeleri eksiltiyoruz
                $stockService->deductForSale($product, $quantity, null, "Sipariş No: {$order->id}");
            }

            // 3. Fişin toplam tutarını güncelle
            $order->update(['total_amount' => $totalAmount]);

            // 4. Mutfak Ekranına Canlı Yayın (Broadcast) Yap
            // Mutfak sadece ID'leri değil, ürünlerin isimlerini de görsün diye relations yüklüyoruz
            $order->load('items.product'); 
            event(new OrderCreated($order));

            return response()->json([
                'success' => true,
                'message' => 'Sipariş başarıyla alındı, stoklar düşüldü ve mutfağa iletildi.',
                'data' => $order
            ]);
        });
    }

    public function activeOrders()
    {
        // Sadece durumu 'pending' (bekleyen) ve 'preparing' (hazırlanan) olan siparişleri getir
        // Fiş kalemleri ve ürün isimleriyle birlikte çekiyoruz
        $orders = Order::with('items.product')
            ->whereIn('status', ['pending', 'preparing'])
            ->orderBy('created_at', 'asc') // İlk gelen ilk çıkar (FIFO) mantığı
            ->get();

        return response()->json([
            'success' => true,
            'data' => $orders
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        
        // Sadece izin verilen durumların girilmesini zorunlu kılıyoruz
        $request->validate([
            'status' => 'required|in:pending,preparing,ready,completed'
        ]);

        $order->update([
            'status' => $request->input('status')
        ]);

        // İleride buraya "Sipariş hazırlandı" diye garsona bildirim atan bir event de eklenebilir

        return response()->json([
            'success' => true,
            'message' => "Sipariş durumu '{$order->status}' olarak güncellendi.",
            'data' => $order
        ]);
    }

    public function checkout(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        // Zaten ödenmiş bir adisyonun tekrar kapanmasını engelle
        if ($order->status === 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Bu adisyon zaten kapatılmış.'
            ], 400);
        }

        // Ödeme yönteminin sadece nakit (cash) veya kredi kartı (credit_card) olmasını zorunlu kıl
        $request->validate([
            'payment_method' => 'required|in:cash,credit_card'
        ]);

        $order->update([
            'status' => 'completed',
            'payment_method' => $request->input('payment_method')
        ]);

        return response()->json([
            'success' => true,
            'message' => "Hesap kapatıldı. Toplam {$order->total_amount} TL, {$order->payment_method} ile tahsil edildi.",
            'data' => $order
        ]);
    }
}