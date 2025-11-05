<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Variables extends Model
{
    protected $table = 'variables';

    // Tu PK real es la columna 'variable' (tipo string) y NO es autoincremental
    protected $primaryKey = 'variable';
    public $incrementing = false;
    protected $keyType = 'string';

    // Si tu tabla NO tiene created_at/updated_at, pon false
    // public $timestamps = false;
}
