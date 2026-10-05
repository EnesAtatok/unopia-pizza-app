<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RawMaterial;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Ciro ve ürün bazlı satış: günlük, haftalık (Pzt–Paz) veya aylık. Ciro yalnızca dönem içinde
     * hesabı kapatılan (ödemesi alınan) adisyonlardan hesaplanır.
     */
    public function dailySummary(Request $request)
    {
        // Geçersiz tarih (ör. 2026-13-45) taşıp başka bir güne dönüşmesin
        $request->validate([
            'date' => 'nullable|date_format:Y-m-d',
            'period' => 'nullable|in:day,week,month',
        ], ['date.date_format' => 'Geçersiz tarih. Biçim: YYYY-AA-GG.']);
        $date = $request->filled('date')
            ? Carbon::createFromFormat('!Y-m-d', $request->query('date'))
            : Carbon::today();
        $period = $request->query('period', 'day');
        [$from, $to] = match ($period) {
            'week' => [$date->copy()->startOfWeek(Carbon::MONDAY), $date->copy()->endOfWeek(Carbon::SUNDAY)],
            'month' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
            default => [$date->copy()->startOfDay(), $date->copy()->endOfDay()],
        };
        $businessId = $request->user()->business_id ?? 1;

        // Dönem içinde hesabı kapatılan adisyonlar
        $closed = Order::where('business_id', $businessId)
            ->where('status', Order::COMPLETED)
            ->whereBetween('updated_at', [$from, $to]);

        $revenue = (float) (clone $closed)->sum('total_amount');
        $closedCount = (clone $closed)->count();
        // Hesap bölmede bir adisyonun bir kısmı nakit, kalanı kart olabilir
        $cash = (float) (clone $closed)->sum('cash_amount');
        $card = (float) (clone $closed)->sum('card_amount');

        $rejectedCount = Order::where('business_id', $businessId)
            ->where('status', Order::REJECTED)
            ->whereBetween('updated_at', [$from, $to])
            ->count();

        // Şu an açık masalardaki (henüz ödenmemiş) tutar — yalnızca bugünü içeren dönem için anlamlı
        $openAmount = now()->between($from, $to)
            ? (float) Order::where('business_id', $businessId)
                ->whereIn('status', array_diff(Order::OPEN_STATUSES, [Order::PENDING]))
                ->sum('total_amount')
            : null;

        // Ürün bazlı satış (kapatılan adisyonlar)
        $productSales = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.business_id', $businessId)
            ->where('orders.status', Order::COMPLETED)
            ->whereBetween('orders.updated_at', [$from, $to])
            ->groupBy('order_items.product_id', 'products.name')
            ->orderByDesc(DB::raw('SUM(order_items.price * order_items.quantity)'))
            ->get([
                'order_items.product_id',
                'products.name',
                DB::raw('SUM(order_items.quantity) as quantity'),
                DB::raw('SUM(order_items.price * order_items.quantity) as revenue'),
            ])
            ->map(fn ($row) => [
                'name' => $row->name ?? 'Silinmiş ürün',
                'quantity' => (int) $row->quantity,
                'revenue' => (float) $row->revenue,
            ]);

        // Stok alışları: Stok → Ekle'de toplam tutar girilen alışlar (dönemin gideri)
        $purchases = StockMovement::with('rawMaterial:id,name,base_unit')
            ->where('business_id', $businessId)
            ->where('type', 'purchase')
            ->whereNotNull('total_cost')
            ->whereBetween('created_at', [$from, $to])
            ->latest()
            ->get()
            ->map(fn (StockMovement $m) => [
                'id' => $m->id,
                'date' => $m->created_at->toIso8601String(),
                'name' => $m->rawMaterial?->name ?? 'Silinmiş hammadde',
                'base_unit' => $m->rawMaterial?->base_unit,
                'quantity' => (float) $m->quantity,
                'total_cost' => (float) $m->total_cost,
                'description' => $m->description,
            ]);
        $purchaseTotal = round($purchases->sum('total_cost'), 2);

        $criticalStocks = RawMaterial::where('business_id', $businessId)
            ->where('critical_level', '>', 0)
            ->whereColumn('current_stock', '<=', 'critical_level')
            ->orderBy('name')
            ->get(['id', 'name', 'base_unit', 'current_stock', 'critical_level']);

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date->format('Y-m-d'),
                'period' => $period,
                'from' => $from->format('Y-m-d'),
                'to' => $to->format('Y-m-d'),
                'revenue' => $revenue,
                'closed_orders' => $closedCount,
                'average_basket' => $closedCount > 0 ? round($revenue / $closedCount, 2) : 0,
                'cash_revenue' => $cash,
                'card_revenue' => $card,
                'rejected_orders' => $rejectedCount,
                'open_amount' => $openAmount,
                'product_sales' => $productSales,
                'purchase_total' => $purchaseTotal,
                'purchases' => $purchases,
                'critical_stocks' => $criticalStocks,
            ],
        ]);
    }
}
