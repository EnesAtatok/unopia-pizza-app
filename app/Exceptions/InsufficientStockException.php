<?php

namespace App\Exceptions;

use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    /** @param string[] $details */
    public function __construct(public readonly array $details)
    {
        parent::__construct('Yetersiz stok: ' . implode(', ', $details) . '. Stok girişi veya sayım yapın.');
    }
}
