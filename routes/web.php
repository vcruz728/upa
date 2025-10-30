<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\FilesController;
use App\Http\Controllers\General\PeticionesController;
use App\Http\Controllers\Oficios\RecepcionController;
use App\Http\Controllers\Oficios\OficioController;
use App\Http\Controllers\Oficios\NuevoController;
use App\Http\Controllers\Catalogos\CatalogosController;


Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard/Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/mi-perfil', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/perfil', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/perfil', [ProfileController::class, 'destroy'])->name('profile.destroy');
});


Route::middleware('auth')->group(function () {
    // Rutas generales
	Route::get('/peticiones/get/procesos-por-area/{id}',  [PeticionesController::class, 'getProcesos'])->name('getProcesosPorArea');
    Route::get('/peticiones/get/usuarios-por-proceso/{id_area}/{id}', [PeticionesController::class, 'getUsersProcesos']);
    Route::get('/oficios/get/linea-tiempo/{id}', [PeticionesController::class, 'getLineaTiempo'])->name('oficios.getLineaTiempo');
    Route::get('/peticiones/get/detalle-directorio/{id}/{tipo}', [PeticionesController::class, 'getDetalleDirectorio'])->name('getDetalleDirectorio');
    Route::get('/files/imprime/pdf/0/{id}', [OficioController::class,'exportapdf']);

    Route::post('/oficios/subir/archivos/{id}', [OficioController::class, 'uploadFiles'])->name('uploadFilesOficio');
    Route::delete('/oficios/elimina/archivo', [OficioController::class, 'deleteFile'])->name('deleteFileOficio');

    
    // Oficio VD
    Route::get('/oficios/nuevo-oficio/{id}', [NuevoController::class, 'index'])->name('nuevoOficio');
    Route::get('/files/imprime/nuevo/pdf/{id}/{id_usuario}/{tipo}', [NuevoController::class,'exportapdf']);
    Route::post('/oficios/guarda/nuevo-oficio', [NuevoController::class, 'saveNuevo'])->name('saveNuevoOficio');

    Route::get('/oficios/nuevo/descargar-archivos-adjuntos/{id}', [NuevoController::class, 'downloadFiles'])->name('oficios.downloadFilesNew');
    Route::post('/oficios/nuevo/subir/archivos/{id}', [NuevoController::class, 'uploadFiles'])->name('oficios.uploadFilesNew');
    Route::delete('/oficios/nuevo/elimina/archivo', [NuevoController::class, 'deleteFile'])->name('oficio.deleteFile');
    Route::put('/oficios/nuevo/area/responde/{id}', [NuevoController::class, 'enviaOficio'])->name('enviaOficioNuevo');
    Route::post('/oficios/nuevo/grupal', [NuevoController::class, 'saveGrupal'])->name('nuevo.oficio.grupal');
    Route::post('/oficios/guarda-nuevo-oficio/grupal', [NuevoController::class, 'saveNuevoOficioGrupal'])->name('saveNuevoOficioGrupal');

    Route::post('oficios/nuevo/guarda/destinatario', [NuevoController::class, 'saveDestinatario'])->name('oficios.saveDestinatarioNuevo');
    Route::delete('oficios/nuevo/elimina/destinatario/{id}', [NuevoController::class, 'deleteDestinatario'])->name('oficios.delDestinatario');
    Route::get('/oficios/nuevo/detalle/{id}', [NuevoController::class, 'detalleOficio'])->name('oficios.detalleNuevo');

    // Catalogos
    Route::get('/catalogos/destinatarios-externos', [CatalogosController::class, 'indexExternos'])->name('catalogos.destinatariosExternos');
    Route::post('/catalogos/destinatarios-externos/guarda', [CatalogosController::class, 'saveDestinatario'])->name('catalogos.saveDestinatario');
    Route::delete('/catalogos/destinatarios-externos/elimina/{id}', [CatalogosController::class, 'deleteDestinatario'])->name('catalogos.deleteDestinatario');
    Route::put('/catalogos/destinatarios-externos/reactiva/{id}', [CatalogosController::class, 'reactivateDestinatario'])->name('catalogos.reactivateDestinatario');


    // Rutas para Rol de recepción
    Route::middleware('RolCheck:1,2')->group(function () {
        //Oficios
    	Route::get('/oficios/listado-oficio',  [RecepcionController::class, 'index'])->name('listadoOficio');
        Route::get('/oficios/recepcion-oficio',  [RecepcionController::class, 'altaOficio'])->name('oficios.recepcionOficio');
        Route::get('/oficios/modifica-oficio/{id}', [RecepcionController::class, 'altaOficio'])->name('oficios.modificaOficio');
        Route::post('/oficios/recepcion-oficio/save',  [RecepcionController::class, 'save'])->name('saveOficio');
    });


    // Rutas para el Rol jefe de área
    Route::middleware('RolCheck:1,3')->group(function () {
        //Oficios
        Route::post('/oficio/asigna-responsable', [OficioController::class, 'asignaResp'])->name('oficioAsignaResponsable');
    });
    
    // Rutas para el Rol colaborador
    Route::middleware('RolCheck:1,4')->group(function () {
        //Oficios
        Route::post('/oficios/proceso/rechazo', [OficioController::class, 'rechazaOFicio'])->name('rechazaOFicio');
    });
    
    
    //Rutas Compartidas Jefe de area y colaborador
    Route::middleware('RolCheck:1,3,4')->group(function () {
        //Oficios
        Route::get('/oficios/mis-oficios',  [OficioController::class, 'index'])->name('misOficios');
        Route::put('/oficios/area/responde/{id}', [OficioController::class, 'respOficio'])->name('respondeOFicio');
        
    });
    
    //Rutas Compartidas Jefe de area y asistente
    Route::middleware('RolCheck:1,3,5')->group(function () {
        //Oficios
        Route::get('/oficios/revisa-respuesta/{id}', [OficioController::class, 'viewResp'])->name('viewRespOficio');
        Route::get('/oficios/descargar-archivos-adjuntos/{id}', [OficioController::class, 'downloadFiles'])->name('oficios.downloadFiles');
        Route::put('/oficios/rechaza/respuesta', [OficioController::class, 'rechazarResp'])->name('rechazarResp');
        Route::put('/oficios/autoriza/respuesta/{id}', [OficioController::class, 'aceptResp'])->name('oficios.aceptResp');

        Route::get('/oficios/nuevo/revisa-respuesta/{id}', [NuevoController::class, 'viewResp'])->name('viewRespNuevoOficio');
        Route::put('/oficios/nuevo/autoriza/respuesta/{id}', [NuevoController::class, 'aceptResp'])->name('aceptRespNuevo');
        Route::put('/oficios/nuevo/rechaza/respuesta', [NuevoController::class, 'rechazarResp'])->name('rechazarRespNuevo');
    });
    
    
    //Rutas Compartidas Jefe de area, colaborador y asistente
    Route::middleware('RolCheck:1,3,4,5')->group(function () {
        //Oficios
        Route::get('/oficios/detalle/respuesta/{id}', [OficioController::class ,'detailResp']);
        Route::get('/oficios/responder/{id}', [OficioController::class ,'indexResp'])->name('oficioResponder');
        Route::post('/oficios/copia/save', [OficioController::class, 'saveCopias'])->name('saveCopiasOficio');
        Route::delete('/oficios/copia/{id}', [OficioController::class, 'deleteCopias'])->name('deleteCopiasOficio');
        Route::post('/oficios/save/respuesta', [OficioController::class, 'saveResp'])->name('saveRespuesta');
    });


    //Rutas Para rol Asistente
    Route::middleware('RolCheck:1,5')->group(function () {
        //Oficios
        Route::get('/oficios/respuestas', [OficioController::class, 'viewOficiosResp'])->name('oficiosRespuestas');        
        Route::post('/oficios/sube-evidencia-recibido', [OficioController::class, 'subeEvidenciaRecibido'])->name('subeEvidenciaRecibido');
        Route::post('/oficios/nuevo/sube-evidencia-recibido', [NuevoController::class, 'subeEvidenciaRecibido'])->name('subeEvidenciaRecibidoNuevo');
        Route::post('Oficios/actualiza-fecha', [OficioController::class, 'actualizaFecha'])->name('oficios.cambiaFecha');
    });


});


Route::get('/files/{carpeta}/{path}', FilesController::class)->middleware('auth');



require __DIR__.'/auth.php';
