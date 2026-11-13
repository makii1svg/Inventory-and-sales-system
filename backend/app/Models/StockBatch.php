<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockBatch extends Model
{
    protected $fillable = [
        'product_id',
        'supplier_id',
        'batch_no',
        'unit_cost',
        'quantity_received',
        'quantity_on_hand',
        'expiry_date',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'quantity_received' => 'integer',
        'quantity_on_hand' => 'integer',
        'expiry_date' => 'date',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
