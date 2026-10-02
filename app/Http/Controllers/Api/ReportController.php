<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\RawMaterial;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{    
    public function dailySummary(Request $request)
    {
        // YETKİ KONTROLÜ: Kullanıcı 'patron' değilse işlemi anında durdur ve 403 (Yasak) döndür
        if ($request->user()->role !== 'patron') {
            return response()->json([
                'success' => false,
                'message' => 'Yetkisiz erişim: Gün sonu ve stok raporlarını yalnızca işletme sahibi görebilir.'
            ], 403); // 403: Forbidden
        }
        
        // 1. Bugün tamamlanan siparişlerin toplam cirosunu hesapla
        $today = Carbon::today();
        
        $dailyRevenue = Order::where('status', 'completed')
            ->whereDate('created_at', $today)
            ->sum('total_amount');

        $completedOrdersCount = Order::where('status', 'completed')
            ->whereDate('created_at', $today)
            ->count();

        // 2. Anlık stoğu, belirlenen kritik seviyenin (veya 0'ın) altına düşen hammaddeleri bul
        // (Veritabanında critical_level varsayılan 0 olduğu için stoğu bitenleri getirecek)
        $criticalStocks = RawMaterial::whereColumn('current_stock', '<=', 'critical_level')->get();

        return response()->json([
            'success' => true,
            'message' => 'Gün sonu özeti başarıyla oluşturuldu.',
            'data' => [
                'date' => $today->format('Y-m-d'),
                'total_orders' => $completedOrdersCount,
                'daily_revenue' => $dailyRevenue,
                'critical_stocks' => $criticalStocks
            ]
        ]);
    }
}
