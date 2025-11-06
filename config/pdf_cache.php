<?php

return [
    // Carpeta relativa al disk('local')
    'dir' => 'pdf_cache',

    // Mantener como máximo N versiones por (oficio, tipo_usuario, id_usuario)
    'keep_per_oficio' => 1,

    // Borrar cualquier PDF con más de X días de antigüedad
    'max_age_days' => 15,

    // Otras carpetas que quieras podar por antigüedad (opcional)
    'extra_dirs' => [
        // 'pdfs_oficios' => 180, // p.ej. 180 días para PDFs “guardados”
    ],
];
