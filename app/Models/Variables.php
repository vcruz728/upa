<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Variables extends Model
{
    protected $table = 'variables';

    protected $primaryKey = 'variable';
    public $incrementing = false;
    protected $keyType = 'string';
}
