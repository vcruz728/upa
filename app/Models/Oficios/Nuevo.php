<?php

namespace App\Models\Oficios;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;


class Nuevo extends Model
{
    use SoftDeletes;
    protected $table = 'nuevos_oficios';

    protected $casts = [
        'finalizado' => 'integer',
        'enviado' => 'integer',
        'revision' => 'integer',
        'masivo' => 'integer',
        'deleted_at' => 'datetime',
    ];
}
