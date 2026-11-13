<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $fillable = ['title', 'category', 'amount', 'status', 'incurred_on', 'notes'];

    protected $casts = [
        'amount' => 'decimal:2',
        'incurred_on' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
