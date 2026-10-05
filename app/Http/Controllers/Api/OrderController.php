<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\WaiterCall;
use App\Models\RestaurantTable;
use App\Services\StockService;
use App\Events\OrderCreated;
use App\Exceptions\InsufficientStockException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Sipariş oluştur.
     * - Müşteri (QR): masa token'ı ile gelir, garson onayı bekler (pending). Mutfağa henüz gitmez.
     * - Personel: masa adıyla gelir, personel girdiği için doğrudan onaylıdır ve mutfağa iletilir.
     */
    public function store(Request $request, StockService $stockService)
    {
        $request->validate([
            'items' => 'required|array|min:1|max:' . config('business.max_order_lines'),
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'nullable|integer|min:1|max:50',
            'items.*.size' => 'nullable|string|max:20',
            'items.*.notes' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:255',
            'client_ref' => 'nullable|string|max:40|alpha_dash',
        ], [
            'items.max' => __('Bir siparişte en fazla :max farklı kalem olabilir.'),
        ]);

        $table = RestaurantTable::findActiveByToken($request->input('table_token'));

        // Aynı gönderim tekrar geldiyse (çift dokunuş, ağ tekrarı) yeni sipariş açılmaz, ilki döner
        if ($table && $request->filled('client_ref')) {
            $existing = Order::with('items.product')->where('client_ref', $request->input('client_ref'))
                ->where('table_number', $table->name)->first();
            if ($existing) {
                return response()->json([
                    'success' => true,
                    'message' => __('Siparişiniz alındı, garson onayından sonra mutfağa iletilecek.'),
                    'data' => $existing,
                ]);
            }
        }
        $staff = auth('sanctum')->user();

        if ($table) {
            $tableNumber = $table->name;
            $source = 'QR';
            $businessId = $table->business_id;
        } elseif ($staff && $request->filled('table_number')) {
            $tableNumber = $request->input('table_number');
            $source = 'Garson';
            $businessId = $staff->business_id ?? 1;
            if (!RestaurantTable::where('name', $tableNumber)->where('is_active', true)->exists()) {
                return response()->json(['success' => false, 'message' => 'Masa bulunamadı.'], 422);
            }
        } else {
            return response()->json([
                'success' => false,
                'message' => __('Masa doğrulanamadı. Lütfen masanızdaki QR kodu tekrar okutun.'),
            ], 422);
        }

        // Müşteri siparişi yalnızca çalışma saatlerinde
        if ($source === 'QR' && !$this->isOpenNow()) {
            return response()->json([
                'success' => false,
                'message' => __('Şu an kapalıyız. Çalışma saatlerimiz :open – :close.', ['open' => config('business.hours.open'), 'close' => config('business.hours.close')]),
            ], 422);
        }

        $qtyTotal = collect($request->input('items'))->sum(fn ($i) => (int) ($i['quantity'] ?? 1));
        if ($source === 'QR' && $qtyTotal > config('business.max_order_quantity')) {
            return response()->json([
                'success' => false,
                'message' => __('Bir siparişte en fazla :max adet ürün olabilir. Daha büyük siparişler için garsonunuza başvurun.', ['max' => config('business.max_order_quantity')]),
            ], 422);
        }

        // Tükenen ürün siparişe eklenemez
        $products = Product::with('recipeItems')->whereIn('id', collect($request->input('items'))->pluck('product_id'))->get()->keyBy('id');
        $soldOut = $products->filter(fn ($p) => !$p->is_active || !$p->is_visible);
        if ($soldOut->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => __('Şu ürün(ler) tükendi: :items. Lütfen sepetinizden çıkarın.', ['items' => $soldOut->map->localizedName()->join(', ')]),
            ], 422);
        }

        // Boy yalnızca ürünün tanımlı boylarından biri olabilir
        $lines = [];
        foreach ($request->input('items') as $item) {
            $product = $products[$item['product_id']];
            $size = $product->resolveSize($item['size'] ?? null);
            if ($size === null) {
                return response()->json([
                    'success' => false,
                    'message' => __(':product için geçersiz boy seçimi. Lütfen ürünü sepetinizden çıkarıp yeniden ekleyin.', ['product' => $product->localizedName()]),
                ], 422);
            }
            $lines[] = ['product' => $product, 'quantity' => (int) ($item['quantity'] ?? 1), 'size' => $size, 'notes' => $item['notes'] ?? null];
        }

        // Stoğu yetmeyen sipariş baştan reddedilir (kesin kontrol onayda, kilitli yapılır)
        $short = $stockService->shortages($lines);
        if ($short) {
            return response()->json([
                'success' => false,
                'message' => __('Stok yetersiz, şu ürün(ler) bu miktarda hazırlanamıyor: :items. Lütfen adedi azaltın veya garsonunuza danışın.', [
                    'items' => $this->productsUsing($lines, $short),
                ]),
            ], 422);
        }

        try {
            $order = DB::transaction(fn () => $this->createOrder($request, $lines, $table, $tableNumber, $source, $businessId, $staff, $stockService));
        } catch (InsufficientStockException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }

        if ($order === null) {
            return response()->json([
                'success' => false,
                'message' => __('Onay bekleyen siparişleriniz var. Garsonunuz onayladıktan sonra yeni sipariş verebilirsiniz.'),
            ], 429);
        }

        $order->load('items.product');

        if ($order->status === Order::APPROVED) {
            $this->notifyKitchen($order);
        }

        return response()->json([
            'success' => true,
            'message' => $order->status === Order::PENDING
                ? __('Siparişiniz alındı, garson onayından sonra mutfağa iletilecek.')
                : 'Sipariş masaya eklendi ve mutfağa iletildi.',
            'data' => $order,
        ]);
    }

    /** Transaction içinde: siparişi ve kalemleri yazar. QR'da masa başına bekleyen sipariş sınırı aşılırsa null. */
    private function createOrder(Request $request, array $lines, ?RestaurantTable $table, string $tableNumber, string $source, int $businessId, $staff, StockService $stockService): ?Order
    {
        if ($table) {
            // Aynı masadan eşzamanlı gönderimler sırayla işlensin
            RestaurantTable::whereKey($table->id)->lockForUpdate()->first();
            // Kilit beklenirken aynı gönderim işlendiyse onu döndür
            if ($request->filled('client_ref')
                && ($existing = Order::where('client_ref', $request->input('client_ref'))->where('table_number', $tableNumber)->first())) {
                return $existing;
            }
            $pending = Order::where('table_number', $tableNumber)->where('status', Order::PENDING)->count();
            if ($pending >= config('business.max_pending_orders_per_table')) {
                return null;
            }
        }

        $order = Order::create([
            'business_id' => $businessId,
            'table_number' => $tableNumber,
            'source' => $source,
            'client_ref' => $table ? $request->input('client_ref') : null,
            'notes' => $request->input('notes'),
            'status' => $source === 'QR' ? Order::PENDING : Order::APPROVED,
            'total_amount' => 0,
        ]);

        foreach ($lines as $line) {
            $order->items()->create([
                'product_id' => $line['product']->id,
                'quantity' => $line['quantity'],
                'size' => $line['size'],
                'notes' => $line['notes'],
                'source' => $source,
                'price' => $line['product']->priceForSize($line['size']),
            ]);
        }

        $order->recalculateTotal();

        // Personel siparişi doğrudan mutfağa gider: stok şimdi düşer
        if ($order->status === Order::APPROVED) {
            $stockService->deductForOrder($order, $staff?->id);
        }

        return $order;
    }

    /**
     * Müşteri: kendi siparişinin canlı durumu. Yalnızca siparişin ait olduğu masanın token'ı ile görülebilir.
     */
    public function track(Request $request, int $id)
    {
        $table = RestaurantTable::findActiveByToken($request->query('table_token'));
        $order = Order::with('items.product')->find($id);

        if (!$table || !$order || $order->table_number !== $table->name) {
            return response()->json(['success' => false, 'message' => __('Sipariş bulunamadı.')], 404);
        }

        return response()->json(['success' => true, 'data' => $order]);
    }

    /**
     * Garson onayı: sipariş mutfağa gider, stok düşer.
     */
    public function approve(Request $request, int $id, StockService $stockService)
    {
        Order::findOrFail($id);

        // Satır kilidi: iki garson aynı anda onaylarsa stok yalnızca bir kez düşer
        try {
            $order = DB::transaction(function () use ($id, $stockService, $request) {
                $order = Order::lockForUpdate()->find($id);
                if ($order->status !== Order::PENDING) {
                    return null;
                }
                $order->update(['status' => Order::APPROVED]);
                $stockService->deductForOrder($order, $request->user()->id);

                return $order;
            });
        } catch (InsufficientStockException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }

        if ($order === null) {
            return response()->json(['success' => false, 'message' => 'Bu sipariş zaten işlenmiş.'], 409);
        }

        $order->load('items.product');
        $this->notifyKitchen($order);

        return response()->json(['success' => true, 'message' => 'Sipariş onaylandı ve mutfağa iletildi.', 'data' => $order]);
    }

    /**
     * Garson reddi: sipariş mutfağa gitmez, ciroya yazılmaz.
     */
    public function reject(int $id)
    {
        Order::findOrFail($id);

        // Koşullu güncelleme: aynı anda onaylanan sipariş reddedilemez
        $changed = Order::whereKey($id)->where('status', Order::PENDING)->update(['status' => Order::REJECTED]);
        if (!$changed) {
            return response()->json(['success' => false, 'message' => 'Yalnızca onay bekleyen sipariş reddedilebilir.'], 409);
        }
        $order = Order::find($id);

        return response()->json(['success' => true, 'message' => 'Sipariş reddedildi.', 'data' => $order]);
    }

    /**
     * Mutfak ekranı: onaylanmış ve henüz servis edilmemiş siparişler
     */
    public function activeOrders()
    {
        $orders = Order::with('items.product')
            ->whereIn('status', Order::KITCHEN_STATUSES)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json(['success' => true, 'data' => $orders]);
    }

    /**
     * Mutfak durum güncellemesi: approved → preparing → ready → served
     */
    public function updateStatus(Request $request, int $id)
    {
        $order = Order::findOrFail($id);

        $request->validate([
            'status' => 'required|in:preparing,ready,served',
        ]);

        if (!in_array($order->status, Order::KITCHEN_STATUSES, true)) {
            return response()->json(['success' => false, 'message' => 'Bu sipariş mutfakta değil.'], 409);
        }

        $order->update(['status' => $request->input('status')]);

        return response()->json(['success' => true, 'data' => $order]);
    }

    /**
     * Hesabı kapat: masadaki tüm açık (onaylı) siparişler ödeme yöntemiyle kapanır.
     * Hesap bölmede (mixed) nakit tutarı gönderilir, kalan kart sayılır; tutarlar raporda ayrı görünür.
     */
    public function checkoutTable(Request $request)
    {
        $data = $request->validate([
            'table' => 'required|string',
            'payment_method' => 'required|in:cash,credit_card,mixed',
            'cash_amount' => 'required_if:payment_method,mixed|nullable|numeric|min:0',
        ]);

        // Satır kilidi: aynı hesap iki kez (iki farklı ödeme yöntemiyle) kapatılamaz
        $result = DB::transaction(function () use ($data) {
            $orders = Order::where('table_number', $data['table'])
                ->whereIn('status', array_diff(Order::OPEN_STATUSES, [Order::PENDING]))
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($orders->isEmpty()) {
                return ['error' => 'Bu masada kapatılacak açık hesap yok.', 'code' => 400];
            }

            $total = round($orders->sum(fn ($o) => (float) $o->total_amount), 2);
            $cash = match ($data['payment_method']) {
                'cash' => $total,
                'credit_card' => 0.0,
                'mixed' => round((float) $data['cash_amount'], 2),
            };

            if ($cash > $total + 0.001) {
                return ['error' => sprintf('Nakit tutar hesap toplamından (₺%s) fazla olamaz.', number_format($total, 2, ',', '.')), 'code' => 422];
            }

            // Nakit tutarı siparişlere sırayla dağıtılır, kalanı karttır
            $method = $cash <= 0.001 ? 'credit_card' : ($cash >= $total - 0.001 ? 'cash' : 'mixed');
            $remainingCash = $cash;
            foreach ($orders as $order) {
                $amount = (float) $order->total_amount;
                $orderCash = min($amount, $remainingCash);
                $remainingCash = round($remainingCash - $orderCash, 2);
                $order->update([
                    'status' => Order::COMPLETED,
                    'payment_method' => $method,
                    'cash_amount' => round($orderCash, 2),
                    'card_amount' => round($amount - $orderCash, 2),
                ]);
            }

            return ['total' => $total, 'cash' => $cash, 'method' => $method];
        });

        if (isset($result['error'])) {
            return response()->json(['success' => false, 'message' => $result['error']], $result['code']);
        }

        $total = $result['total'];

        return response()->json([
            'success' => true,
            'message' => sprintf('%s hesabı kapatıldı: ₺%s', $data['table'], number_format($total, 0, ',', '.')),
        ]);
    }

    /**
     * Masa taşı: kaynak masadaki tüm açık siparişler ve bekleyen çağrılar hedef masaya geçer.
     */
    public function moveTable(Request $request)
    {
        $data = $request->validate([
            'from' => 'required|string',
            'to' => 'required|string|different:from',
        ]);

        $target = RestaurantTable::where('name', $data['to'])->where('is_active', true)->first();
        if (!$target) {
            return response()->json(['success' => false, 'message' => 'Hedef masa bulunamadı.'], 404);
        }

        $targetBusy = Order::where('table_number', $data['to'])->whereIn('status', Order::OPEN_STATUSES)->exists();
        if ($targetBusy) {
            return response()->json(['success' => false, 'message' => "{$data['to']} dolu. Lütfen boş bir masa seçin."], 409);
        }

        $moved = DB::transaction(function () use ($data) {
            WaiterCall::where('table_number', $data['from'])->where('status', 'pending')
                ->update(['table_number' => $data['to']]);

            return Order::where('table_number', $data['from'])
                ->whereIn('status', Order::OPEN_STATUSES)
                ->update(['table_number' => $data['to']]);
        });

        if ($moved === 0) {
            return response()->json(['success' => false, 'message' => 'Taşınacak açık sipariş yok.'], 400);
        }

        return response()->json(['success' => true, 'message' => "{$data['from']} → {$data['to']} taşındı."]);
    }

    /**
     * Paneldeki Masalar Ekranı: masa durumları, sayaçlar ve Bekleyenler sütunu
     */
    public function panelTables()
    {
        $tableRows = RestaurantTable::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['name', 'section']);

        $openOrders = Order::with('items.product')
            ->whereIn('status', Order::OPEN_STATUSES)
            ->orderBy('created_at')
            ->get()
            ->groupBy('table_number');

        $activeCalls = WaiterCall::where('status', 'pending')
            ->orderBy('created_at')
            ->get()
            ->groupBy('table_number');

        $tables = [];
        $counts = ['dolu' => 0, 'bos' => 0, 'bekliyor' => 0];

        foreach ($tableRows as $row) {
            $orders = $openOrders->get($row->name, collect());
            $calls = $activeCalls->get($row->name, collect());
            $accepted = $orders->where('status', '!=', Order::PENDING);
            $pending = $orders->where('status', Order::PENDING);

            $totalAmount = (float) $accepted->sum(fn ($o) => (float) $o->total_amount);
            $since = $orders->min('created_at');
            $durationMinutes = $since ? max(1, (int) $since->diffInMinutes(now())) : 0;

            // İlgilen sebebi: hesap > garson çağrısı > yeni sipariş
            $alertReason = null;
            $call = $calls->first();
            if ($call) {
                $alertReason = preg_match('/hesa[pb]/u', mb_strtolower($call->reason)) ? 'Hesap istiyor' : 'Garson çağırıyor';
            } elseif ($pending->isNotEmpty()) {
                $alertReason = 'Yeni sipariş';
            }

            $status = $alertReason ? 'ilgilen' : ($accepted->isNotEmpty() ? 'dolu' : 'bos');
            $counts[$status === 'ilgilen' ? 'bekliyor' : $status]++;

            // Masa detayı için ürün satırları (her satır kendi kaynağıyla)
            $items = $accepted->flatMap(fn ($o) => $o->items->map(fn ($it) => [
                'id' => $it->id,
                'order_id' => $o->id,
                'name' => $it->product?->name ?? 'Ürün',
                'quantity' => $it->quantity,
                'size' => $it->size,
                'notes' => $it->notes,
                'source' => $it->source ?: $o->source,
                'price' => (float) $it->price,
                'status' => $o->status,
            ]))->values();

            $tables[] = [
                'id' => $row->name,
                'name' => $row->name,
                'section' => $row->section,
                'status' => $status,
                'alertReason' => $alertReason,
                'totalAmount' => $totalAmount,
                'durationMinutes' => $durationMinutes,
                'items' => $items,
                'pendingOrderCount' => $pending->count(),
            ];
        }

        $pendingOrders = Order::with('items.product')
            ->where('status', Order::PENDING)
            ->orderBy('created_at')
            ->get();

        $pendingCalls = WaiterCall::where('status', 'pending')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'tables' => $tables,
                'counts' => $counts,
                'pending' => [
                    'orders' => $pendingOrders,
                    'calls' => $pendingCalls,
                ],
                'stock_alerts' => $this->stockAlerts(),
            ],
        ]);
    }

    /**
     * Stoğu biten (0 veya altı) ve bir reçetede kullanılan hammaddeler, etkilediği ürünlerle.
     * Bu ürünler sipariş edilemez (otomatik "Tükendi"); personele uyarı olarak gösterilir.
     */
    private function stockAlerts(): array
    {
        return RawMaterial::with('recipeItems.product:id,name')
            ->where('current_stock', '<=', 0.0005)
            ->whereHas('recipeItems')
            ->orderBy('name')
            ->get()
            ->map(fn (RawMaterial $m) => [
                'name' => $m->name,
                'products' => $m->recipeItems->pluck('product.name')->filter()->unique()->values(),
            ])
            ->all();
    }

    /**
     * Garsonun masaya ürün eklemesi. Masada açık onaylı sipariş varsa ona eklenir, yoksa yeni sipariş açılır.
     * Personel girdiği için onay beklemez, doğrudan mutfağa gider.
     */
    public function addItemToTable(Request $request, StockService $stockService)
    {
        $data = $request->validate([
            'table' => 'required|string',
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'nullable|integer|min:1|max:50',
            'size' => 'nullable|string|max:20',
            'notes' => 'nullable|string|max:255',
        ]);

        if (!RestaurantTable::where('name', $data['table'])->where('is_active', true)->exists()) {
            return response()->json(['success' => false, 'message' => 'Masa bulunamadı.'], 422);
        }

        $product = Product::findOrFail($data['product_id']);
        if (!$product->is_active) {
            return response()->json(['success' => false, 'message' => "{$product->name} tükendi."], 422);
        }

        $size = $product->resolveSize($data['size'] ?? null);
        if ($size === null) {
            return response()->json(['success' => false, 'message' => "{$product->name} için geçersiz boy seçimi."], 422);
        }

        $staff = $request->user();

        try {
            $order = DB::transaction(function () use ($data, $product, $size, $staff, $stockService) {
                $order = Order::create([
                    'business_id' => $staff->business_id ?? 1,
                    'table_number' => $data['table'],
                    'source' => 'Garson',
                    'status' => Order::APPROVED,
                    'total_amount' => 0,
                ]);

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $data['quantity'] ?? 1,
                    'size' => $size,
                    'notes' => $data['notes'] ?? null,
                    'source' => 'Garson',
                    'price' => $product->priceForSize($size),
                ]);

                $order->recalculateTotal();
                $stockService->deductForOrder($order, $staff->id);

                return $order;
            });
        } catch (InsufficientStockException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 409);
        }

        $order->load('items.product');
        $this->notifyKitchen($order);

        return response()->json(['success' => true, 'message' => 'Ürün masaya eklendi.', 'data' => $order]);
    }

    /**
     * Garson Çağrısı Oluştur
     */
    public function callWaiter(Request $request)
    {
        $request->validate([
            'table_token' => 'required|string',
            'reason' => 'required|string|max:100',
        ]);

        $table = RestaurantTable::findActiveByToken($request->input('table_token'));
        if (!$table) {
            return response()->json([
                'success' => false,
                'message' => __('Masa doğrulanamadı. Lütfen masanızdaki QR kodu tekrar okutun.'),
            ], 422);
        }

        // Aynı masadan tekrarlanan çağrılar yeni kayıt açmaz: aynı sebep bekliyorsa o çağrı döner,
        // masada zaten 3 bekleyen çağrı varsa en sonuncusu döner (müşteri yine "iletildi" görür)
        $call = DB::transaction(function () use ($table, $request) {
            RestaurantTable::whereKey($table->id)->lockForUpdate()->first();

            $pending = WaiterCall::where('table_number', $table->name)->where('status', 'pending')->latest('id')->get();
            $existing = $pending->firstWhere('reason', $request->input('reason'))
                ?? ($pending->count() >= 3 ? $pending->first() : null);

            return $existing ?? WaiterCall::create([
                'business_id' => $table->business_id,
                'table_number' => $table->name,
                'reason' => $request->input('reason'),
                'status' => 'pending',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => __('Garson çağrınız personele iletildi.'),
            'data' => $call,
        ]);
    }

    /**
     * Garson Çağrısını Çözümlendi Yap
     */
    public function resolveWaiterCall(int $id)
    {
        WaiterCall::findOrFail($id)->update(['status' => 'resolved']);

        return response()->json(['success' => true, 'message' => 'Çağrı tamamlandı.']);
    }

    /** Çalışma saati kontrolü (gece yarısını geçen kapanışlar desteklenir) */
    private function isOpenNow(): bool
    {
        if (app()->environment('local') && config('business.always_open')) {
            return true;
        }

        $now = now(config('business.timezone'));
        $toMinutes = fn (string $hhmm) => ((int) explode(':', $hhmm)[0]) * 60 + (int) (explode(':', $hhmm)[1] ?? 0);
        $minutes = $now->hour * 60 + $now->minute;
        $open = $toMinutes(config('business.hours.open'));
        $close = $toMinutes(config('business.hours.close'));

        return $close > $open ? $minutes >= $open && $minutes < $close : $minutes >= $open || $minutes < $close;
    }

    /** Yetmeyen hammaddeleri kullanan sepet ürünlerinin adları */
    private function productsUsing(array $lines, array $materialNames): string
    {
        $ids = RawMaterial::whereIn('name', $materialNames)->pluck('id')->all();

        return collect($lines)
            ->filter(fn ($l) => $l['product']->recipeItems->whereIn('raw_material_id', $ids)->isNotEmpty())
            ->map(fn ($l) => $l['product']->localizedName())
            ->unique()
            ->join(', ');
    }

    private function notifyKitchen(Order $order): void
    {
        try {
            event(new OrderCreated($order));
        } catch (\Throwable $e) {
            // WebSocket sunucusu kapalıysa sipariş yine kaydedilir; mutfak ekranı periyodik olarak da yenilenir
        }
    }
}
