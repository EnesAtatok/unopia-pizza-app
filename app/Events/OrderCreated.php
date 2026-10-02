<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $order;

    /**
     * Olay tetiklendiğinde sipariş bilgilerini alır.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Yayının yapılacağı kanal. (Örn: 1 ID'li işletmenin mutfak kanalı)
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('kitchen.' . $this->order->business_id),
        ];
    }

    /**
     * Frontend'e (React/Vue) gidecek verinin adı
     */
    public function broadcastAs(): string
    {
        return 'new.order';
    }
}