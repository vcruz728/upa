<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Descanso extends Model
{
    use HasFactory;
    protected $fillable = ['descanso_dia', 'descripcion'];
    protected $casts = [
        'descanso_dia' => 'date',
    ];
}
