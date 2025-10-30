<?php

namespace App\Models\Oficios;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Support\FilenameSanitizer as FS;

class DestinatarioOficio extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'destinatarios_oficio';
    protected function archivoRespuesta(): Attribute
    {
        return Attribute::make(
            set: function (?string $value) {
                if ($value === null) return null;
                // limpia toda la ruta (segmento por segmento)
                return FS::cleanPath($value);
            }
        );
    }
}
