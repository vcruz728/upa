<?php

namespace App\Models\Oficios;

use App\Support\FilenameSanitizer as FS;

use Illuminate\Database\Eloquent\Model;

class ArchivoOficio extends Model
{
    protected $table = 'archivos_oficios';

    protected $fillable = [
        'id_oficio',
        'archivo',
    ];

    protected function archivo(): Attribute
    {
        return Attribute::make(
            set: fn($value) => $value ? FS::cleanPath($value) : null
        );
    }


    protected function nombre(): Attribute
    {
        return Attribute::make(
            set: fn($value) => $value ? FS::cleanBase(pathinfo($value, PATHINFO_FILENAME)) . '.' . strtolower(pathinfo($value, PATHINFO_EXTENSION)) : null
        );
    }
    public function oficio()
    {
        return $this->belongsTo(Oficio::class, 'id_oficio');
    }
}
