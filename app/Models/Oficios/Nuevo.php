<?php

namespace App\Models\Oficios;

use Illuminate\Database\Eloquent\Model;

class Nuevo extends Model
{
    protected $table = 'nuevos_oficios';

    protected $casts = [
    	'finalizado' => 'integer',
        'enviado' => 'integer',
        'revision' => 'integer',
        'masivo' => 'integer',
    ];
}
