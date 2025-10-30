<?php

namespace App\Models\Catalogos;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DestinatarioExterno extends Model
{
    use SoftDeletes;

    protected $table = 'cat_destinatarios_externos';

    protected $fillable = [
        'id_area',
        'nombre',
        'cargo',
        'dependencia',
        'email',
    ];

    protected $casts = [
        'id_area' => 'integer',
    ];

    public function area()
    {
        return $this->belongsTo('App\Models\Catalogos\Area', 'id_area');
    }

    // ✅ Scope para acotar por el área actual (o una pasada explícitamente)
    public function scopeForCurrentArea($query, ?int $areaId = null)
    {
        $areaId = $areaId ?? optional(auth()->user())->id_area;
        if ($areaId) {
            $query->where('id_area', $areaId);
        }
        return $query;
    }

    // ✅ (Opcional) Setear id_area automáticamente al crear
    protected static function booted()
    {
        static::creating(function ($model) {
            if (auth()->check() && empty($model->id_area)) {
                $model->id_area = auth()->user()->id_area;
            }
        });
    }

    // ⚠️ Evita depender de Auth() dentro del modelo si puedes.
    // Mejor usar el scope desde el controlador.
    public static function getSel()
    {
        return self::forCurrentArea()
            ->select('id as value', 'nombre as label')
            ->orderBy('nombre')
            ->get();
    }
}
