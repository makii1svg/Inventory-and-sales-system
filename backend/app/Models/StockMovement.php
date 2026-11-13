<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    public const TYPES = [
        'initial_stock',
        'purchase_order',
        'sale',
        'sale_void',
        'manual_adjustment',
        'stock_in',
        'stock_out',
    ];

    protected $fillable = [
        'product_id',
        'batch_id',
        'user_id',
        'movement_type',
        'reason_code',
        'quantity',
        'reference',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function batch()
    {
        return $this->belongsTo(StockBatch::class);
    }
}
