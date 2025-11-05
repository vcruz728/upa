<?php

namespace App\Http\Controllers\Oficios;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Variables;
use App\Models\User;
use App\Models\Catalogos\DestinatarioExterno;
use App\Models\Oficios\Nuevo;
use App\Models\Oficios\Copia;
use App\Models\Oficios\ArchivoOficio;
use App\Models\Directorio\Directorio;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Mail\Oficios\JefeNuevo;
use App\Mail\Oficios\ColaboradorNuevo;
use App\Mail\Oficios\AceptaRespuestaJefe;
use App\Mail\Oficios\Enviado;
use App\Mail\Oficios\RechazoRespuestaJefe;
use App\Mail\Oficios\RechazoRespuestaFinal;
use Illuminate\Support\Facades\Mail;
use App\Models\Oficios\DestinatarioOficio;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Helpers\PdfHtml;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;


class NuevoController extends Controller
{


	public function index($id)
	{
		$oficio  = Nuevo::find($id);

		$directorio = Directorio::select('id as value', 'nombre as label')
			->whereNotIn('id', function ($query) use ($id) {
				$query->select('id_directorio')
					->from('oficios_copias')
					->where('id_nuevo_oficio', $id)
					->whereNotNull('id_directorio');
			})
			->orderBy('nombre')
			->get();

		$copy = Copia::select('id', 'id_nuevo_oficio', 'id_directorio', 'nombre', 'cargo', 'dependencia')
			->where('id_nuevo_oficio', $id)
			->get();

		$archivos = ArchivoOficio::where('id_nuevo_oficio', $id)
			->get()
			->map(function ($archivo) {
				$extension = pathinfo($archivo->archivo, PATHINFO_EXTENSION);
				$url = in_array($extension, ['pdf', 'jpg', 'jpeg', 'png'])
					? $archivo->archivo
					: asset("files/" . $archivo->archivo);

				return [
					'serverId' => $archivo->id,
					'origin' => 1,
					'source' => $archivo->id,
					'file' => $archivo->archivo,
					'options' => [
						'type' => 'local',
						'file' => [
							'name' => $archivo->nombre,
							'size' => \Storage::disk('files')->exists($archivo->archivo) ? \Storage::disk('files')->size($archivo->archivo) : 0,
							'type' => mime_content_type(\Storage::disk('files')->path($archivo->archivo)),
						],
						'metadata' => [
							'url' => $url,
							'extension' => $extension,
						],
					],
				];
			});

		// ====== AQUÍ EL CAMBIO IMPORTANTE ======
		$areaId = Auth::user()->id_area ?? null;

		$externos = DestinatarioExterno::select('id as value', 'nombre as label')
			->when($areaId, fn($q) => $q->where('id_area', $areaId)) // filtra por el área del usuario
			->whereNotIn('id', function ($query) use ($id) {
				$query->select('id_usuario')
					->from('destinatarios_oficio')
					->where('id_oficio', $id)
					->where('tipo_usuario', 2) // externos
					->whereNull('deleted_at');
			})
			->orderBy('nombre')
			->get();
		// =======================================

		$directorioAll = Directorio::select('id as value', 'nombre as label')
			->whereNotIn('id', function ($query) use ($id) {
				$query->select('id_usuario')
					->from('destinatarios_oficio')
					->where('id_oficio', $id)
					->where('tipo_usuario', 1) // internos
					->whereNull('deleted_at');
			})
			->orderBy('nombre')
			->get();

		$destinatarios = DestinatarioOficio::select(
			'destinatarios_oficio.id',
			DB::raw("COALESCE(directorios.nombre, cat_destinatarios_externos.nombre) as nombre"),
			DB::raw("COALESCE(directorios.cargo, cat_destinatarios_externos.cargo) as cargo"),
			DB::raw("COALESCE(directorios.dependencia, cat_destinatarios_externos.dependencia) as dependencia"),
			'destinatarios_oficio.tipo_usuario',
			'destinatarios_oficio.id_usuario'
		)
			->leftJoin('directorios', function ($join) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw("1"))
					->on('destinatarios_oficio.id_usuario', '=', 'directorios.id');
			})
			->leftJoin('cat_destinatarios_externos', function ($join) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw("2"))
					->on('destinatarios_oficio.id_usuario', '=', 'cat_destinatarios_externos.id');
			})
			->where('destinatarios_oficio.id_oficio', $id)
			->orderBy('destinatarios_oficio.id', 'desc')
			->get();

		return Inertia::render('Oficios/Nuevo', [
			'status' => session('status'),
			'error' => session('error'),
			'destinatariosOficio' => $destinatarios,
			'externos' => $externos,
			'oficio' => $oficio,
			'files' => $archivos,
			'directorio' => $directorio,
			'copy' => $copy,
			'directorioAll' => $directorioAll
		]);
	}

	public function exportapdf(\Illuminate\Http\Request $request, $id, $id_usuario, $tipo_usuario)
	{
		// ===== 1) Datos como ya los traías =====
		$of = Nuevo::findOrFail($id);
		$fecha = $of->fecha_envio ?: date('Y-m-d');

		setlocale(LC_TIME, 'es_ES.UTF-8', 'Spanish_Spain.1252');
		$fechaEscrita = strftime('%d de %B de %Y', strtotime($fecha));
		if (strpos($fechaEscrita, '%') !== false) {
			$meses = [1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril', 5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto', 9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre'];
			$fechaEscrita = date('d', strtotime($fecha)) . ' de ' . $meses[(int)date('m', strtotime($fecha))] . ' de ' . date('Y', strtotime($fecha));
		}

		$copias = Copia::where('id_nuevo_oficio', $id)->get();

		$oficio = Nuevo::select(
			'nuevos_oficios.iniciales_area as area',
			'nuevos_oficios.iniciales_proceso as proceso',
			'cat_areas.siglas'
		)
			->join('cat_areas', 'cat_areas.id', 'nuevos_oficios.id_area')
			->where('nuevos_oficios.id', $id)
			->first();

		$tabla = ((int)$tipo_usuario === 1) ? 'directorios' : 'cat_destinatarios_externos';

		$respuesta = Nuevo::select(
			'nuevos_oficios.oficio_respuesta',
			"$tabla.nombre",
			"$tabla.cargo",
			"$tabla.dependencia",
			'nuevos_oficios.respuesta',
			'destinatarios_oficio.folio'
		)
			->join('destinatarios_oficio', function ($join) use ($id_usuario, $tipo_usuario, $id) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw((int)$tipo_usuario));
				$join->on('destinatarios_oficio.id_usuario', '=', DB::raw((int)$id_usuario));
				$join->on('destinatarios_oficio.id_oficio', '=', DB::raw((int)$id));
			})
			->leftJoin($tabla, "$tabla.id", "=", "destinatarios_oficio.id_usuario")
			->where('nuevos_oficios.id', $id)
			->first();

		if ($respuesta && $respuesta->oficio_respuesta === null) {
			$respuesta->oficio_respuesta = $respuesta->folio;
		}

		// HTML del editor adaptado a Dompdf
		$contenidoPdf = PdfHtml::pdfifySunEditorHtml($respuesta->respuesta ?? '');
		$contenidoPdf = PdfHtml::absolutizePublicStorage($contenidoPdf);

		// ===== 2) Clave de caché (lo mínimo necesario) =====
		// ===== 2) Clave de caché =====
		// ===== 2) Clave de caché robusta =====
		// ===== 2) Clave de caché robusta =====
		$versionPlantilla = 'v2';

		// Pivot y destinatario
		$destPivot = DB::table('destinatarios_oficio')
			->where('id_oficio', $id)
			->where('id_usuario', (int)$id_usuario)
			->where('tipo_usuario', (int)$tipo_usuario)
			->whereNull('deleted_at')           // 👈
			->first();

		$destRow = DB::table($tabla)
			->where('id', (int)$id_usuario)
			->select('nombre', 'cargo', 'dependencia', 'updated_at')
			->first();

		// Timestamps seguros desde strings
		$u1 = $destRow?->updated_at   ? strtotime($destRow->updated_at)   : null;
		$u2 = $destPivot?->updated_at ? strtotime($destPivot->updated_at) : null;

		// Hash destinatario y copias
		$destHash = sha1(json_encode([
			'n'  => $destRow->nombre ?? null,
			'c'  => $destRow->cargo ?? null,
			'd'  => $destRow->dependencia ?? null,
			'u1' => $u1,
			'u2' => $u2,
		]));

		$copiasHash = sha1(collect($copias)->map(function ($c) {
			return [
				'n' => $c->nombre,
				'c' => $c->cargo,
				'd' => $c->dependencia,
				'u' => optional($c->updated_at)->timestamp, // Eloquent -> Carbon
			];
		})->toJson());

		// Oficio No. y contenido
		$respNo   = $respuesta ? ($respuesta->oficio_respuesta ?? $respuesta->folio) : null;
		$respRaw  = (string)($respuesta->respuesta ?? $of->respuesta ?? '');
		$respHash = sha1($respRaw);
		$htmlHash = sha1($contenidoPdf);

		// Firma final
		$stamp = implode('|', [
			$versionPlantilla,
			"id:$id",
			"tipo:$tipo_usuario",
			"usr:$id_usuario",
			'of_up:' . optional($of->updated_at)->timestamp,
			'resp_hash:' . $respHash,
			'html_hash:' . $htmlHash,
			'anio:' . date('Y'),
			'fecha:' . $fechaEscrita,
			'area:' . $oficio->area,
			'proc:' . $oficio->proceso,
			'sig:' . $oficio->siglas,
			'dest:' . $destHash,
			'copias:' . $copiasHash,
			'respno:' . $respNo,
		]);

		$key   = sha1($stamp);
		$etag  = '"' . $key . '"';

		$rel   = "pdf_cache/oficio_{$id}_{$tipo_usuario}_{$id_usuario}_{$key}.pdf";
		$disk  = \Storage::disk('local');
		$disk->makeDirectory('pdf_cache');
		$abs   = $disk->path($rel);

		// Bypass desde el front
		$skipCache = ($request->query('nocache') === '1') || $request->has('_print_ts');

		// Servir caché
		$hasCache = !$skipCache && $disk->exists($rel) && file_exists($abs);
		if ($hasCache) {
			clearstatcache(true, $abs);
			$mtime   = @filemtime($abs) ?: time();
			$lastMod = gmdate('D, d M Y H:i:s', $mtime) . ' GMT';

			if (
				$request->headers->get('If-None-Match') === $etag
				|| $request->headers->get('If-Modified-Since') === $lastMod
			) {
				return response('', 304, [
					'ETag'          => $etag,
					'Last-Modified' => $lastMod,
					'Cache-Control' => 'public, max-age=86400',
				]);
			}

			return response()->file($abs, [
				'Content-Type'        => 'application/pdf',
				'Content-Disposition' => 'inline; filename="respuesta_oficio.pdf"',
				'Cache-Control'       => 'public, max-age=86400',
				'ETag'                => $etag,
				'Last-Modified'       => $lastMod,
			]);
		}

		// ===== 5) Generar y guardar =====
		$pdf = \Barryvdh\DomPDF\Facade\Pdf::setOptions([
			'dpi'                    => 96,
			'enable_font_subsetting' => true,
			'isHtml5ParserEnabled'   => true,
			'isRemoteEnabled'        => true,  // 👈 habilita HTTP/HTTPS
			'chroot'                 => public_path(),     // 👈 restringe a /public
		])->loadView('Oficios.Vice', [
			'respuesta'     => $respuesta,
			'copias'        => $copias,
			'oficio'        => $oficio,
			'fechaEscrita'  => $fechaEscrita,
			'tipo_usuario'  => (int)$tipo_usuario,
			'contenidoPdf'  => $contenidoPdf,
		])->setPaper('letter', 'portrait');

		$disk->put($rel, $pdf->output());
		$abs     = $disk->path($rel);
		clearstatcache(true, $abs);
		$mtime   = @filemtime($abs) ?: time();
		$lastMod = gmdate('D, d M Y H:i:s', $mtime) . ' GMT';

		return response()->file($abs, [
			'Content-Type'        => 'application/pdf',
			'Content-Disposition' => 'inline; filename="respuesta_oficio.pdf"',
			'Cache-Control'       => 'public, max-age=86400',
			'ETag'                => $etag,
			'Last-Modified'       => $lastMod,
		]);
	}

	public function saveNuevo(Request $request)
	{
		$request->validate([
			'asunto' => 'nullable|min:2',
		]);

		$oficio = Nuevo::find($request->id_oficio);
		$isNew  = !$oficio;

		if ($isNew) {
			$oficio = new Nuevo();
			// El área del oficio se fija al crear
			$oficio->id_area = \Auth::user()->id_area;
		}

		// Usa SIEMPRE el área del oficio para resolver al jefe (no la del usuario logueado)
		$area = $oficio->id_area ?? \Auth::user()->id_area;

		$jefe = User::select('iniciales')
			->where('rol', 3)
			->where('id_area', $area)
			->first();

		// Campos básicos
		$oficio->respuesta  = $request->asunto;
		$oficio->comentario = $request->comentario;

		// Si quieres snapshot solo al crear (o cuando esté vacío):
		if ($jefe && ($isNew || empty($oficio->iniciales_area))) {
			$oficio->iniciales_area = $jefe->iniciales;
		}

		// Lógica por rol
		$rol = \Auth::user()->rol;

		if ($rol == 3) { // Jefe
			if ($oficio->id_usuario === null) {
				$oficio->revision = 1;
			}
		} elseif ($rol == 4) { // Proceso
			// Asigna si no estaba asignado aún (evita sobreescribir a otro usuario)
			if ($oficio->id_usuario === null) {
				$oficio->id_usuario = \Auth::id();
				$oficio->iniciales_proceso = \Auth::user()->iniciales;
			}
		} elseif ($rol == 5) {
			// NO sobrescribas id_usuario/iniciales_proceso aquí (el ternario actual los dejaba en null)
			// Si quieres permitir que rol 5 asigne cuando está vacío:
			// if ($oficio->id_usuario === null) {
			//     $oficio->id_usuario = \Auth::id();
			//     $oficio->iniciales_proceso = \Auth::user()->iniciales;
			// }
		}

		$oficio->save();

		if ($isNew) {
			return redirect()
				->route('nuevoOficio', ['id' => $oficio->id])
				->with('status', 'Se guardó el nuevo oficio.');
		} else {
			return back()->with('status', 'Se guardó la respuesta del oficio.');
		}
	}

	/* 	public function saveNuevo(Request $request)
	{
		$request->validate([
			'asunto' => 'nullable|min:2'
		]);


		$bandera = Nuevo::find($request->id_oficio);
		if (empty($bandera)) {
			$respuesta = new Nuevo();
			$respuesta->id_area = \Auth::user()->id_area;
		} else {
			$respuesta = Nuevo::find($bandera->id);
		}

		$jefe = User::select('iniciales')->where('rol', 3)->where('id_area', \Auth::user()->id_area)->first();



		$respuesta->respuesta = $request->asunto;
		$respuesta->comentario = $request->comentario;
		$respuesta->iniciales_area = $jefe->iniciales;

		if (\Auth::user()->rol == 5) {
			if (empty($bandera) || $respuesta->id_usuario == \Auth::user()->id) {
				$respuesta->id_usuario = \Auth::user()->rol == 4 ? \Auth::user()->id : null;
				$respuesta->iniciales_proceso = \Auth::user()->rol == 4 ? \Auth::user()->iniciales : null;
			}
		} else if (\Auth::user()->rol == 3) {
			if ($respuesta->id_usuario == null) {
				$respuesta->revision = 1;
			}
		} else if (\Auth::user()->rol == 4) {
			$respuesta->id_usuario = \Auth::user()->rol == 4 ? \Auth::user()->id : null;
			$respuesta->iniciales_proceso =  \Auth::user()->rol == 4 ? \Auth::user()->iniciales : null;
		}
		$respuesta->save();




		if (empty($bandera)) {
			return redirect()->route('nuevoOficio', ['id' => $respuesta->id])->with('status', "Se guardo el nuevo oficio.");
		} else {
			return back()->with('status', "Se guardo la respuesta del oficio.");
		}
	}
 */
	public function actualizaFecha(Request $request)
	{
		$request->validate([
			'fecha' => 'required|date'
		]);

		$oficio = Nuevo::find($request->id);
		if (!$oficio) {
			return response()->json(['error' => 'Oficio no encontrado'], 404);
		}

		$oficio->fecha_envio = $request->fecha;
		$oficio->save();

		return back()->with('status', "Se actualizo la fecha de respuesta del oficio.");
	}


	public function uploadFiles(Request $request, $id)
	{
		ini_set('upload_max_filesize', '30M');
		ini_set('post_max_size', '30M');

		if (!$request->expectsJson()) {
			$request->headers->set('Accept', 'application/json');
		}

		$request->validate([
			'file' => 'required|file|max:25600|mimes:pdf,doc,docx,jpg,png,xlsx,xls,csv,txt,pptx,xml,zip,rar',
		]);

		if ($request->hasFile('file')) {
			$file = $request->file('file');

			$archivo = 'adjuntos_oficios/' . time() . "_" . \Auth::user()->id . "_" . $request->file->getClientOriginalName();
			$path = \Storage::disk('files')->put($archivo, \File::get($request->file));

			$archivoOficio = new ArchivoOficio();
			$archivoOficio->id_nuevo_oficio = $id;
			$archivoOficio->archivo = $archivo;
			$archivoOficio->nombre = $request->file->getClientOriginalName();
			$archivoOficio->save();

			return response()->json([
				'id' => $archivoOficio->id,
				'path' => $path,
				'url' => \Storage::url($path),
			]);
		}

		return response()->json(['error' => 'No se subió ningún archivo'], 400);
	}

	public function deleteFile(Request $request)
	{
		$idArchivo = $request->getContent();

		if (!$idArchivo) {
			return response()->json(['error' => 'Archivo no especificado'], 400);
		}

		$archivo = ArchivoOficio::find($idArchivo);

		if (!$archivo) {
			return response()->json(['error' => 'Archivo no encontrado'], 400);
		}



		if (\Storage::disk('files')->exists($archivo->archivo)) {
			\Storage::disk('files')->delete($archivo->archivo);
			ArchivoOficio::where('id', $archivo->id)->delete();
			return response()->json(['success' => true]);
		}

		return response()->json(['error' => 'Archivo no encontrado'], 404);
	}

	public function downloadFiles($id, $tipo)
	{
		$archivos = ArchivoOficio::where($tipo, $id)->get();

		if ($archivos->isEmpty()) {
			return redirect()->route('dashboard')->withErrors(['error' => 'No hay archivos para descargar']);
		}

		$zip = new \ZipArchive();
		$zipFileName = 'archivos_oficio_' . $id . '.zip';
		$tmpFile = tempnam(sys_get_temp_dir(), $zipFileName);

		if ($zip->open($tmpFile, \ZipArchive::CREATE) !== true) {
			return redirect()->route('dashboard')->withErrors(['error' => 'No se pudo crear el archivo comprimido.']);
		}

		foreach ($archivos as $archivo) {
			$path = \Storage::disk('files')->path($archivo->archivo);
			if (file_exists($path)) {
				$zip->addFile($path, $archivo->nombre);
			}
		}

		$zip->close();

		return response()->download($tmpFile, $zipFileName)->deleteFileAfterSend(true);
	}

	public function enviaOficio($id)
	{
		$oficio = Nuevo::find($id);

		$jefe = User::where('rol', 3)->where('id_area', $oficio->id_area)->first();

		if (\Auth::user()->rol == 3) {
			$oficio->revision = 1;
			$oficio->finalizado = 1;

			$asis = User::where('rol', 5)->first();
			Mail::to($asis->email)->later(now()->addSeconds(2), new JefeNuevo($asis->name, $id));
		} else if (\Auth::user()->rol == 4 || \Auth::user()->rol == 2) {
			$oficio->revision = 1;
			$usuario = infoUsuario($oficio->id_usuario);
			Mail::to($jefe->email)->later(now()->addSeconds(2), new ColaboradorNuevo($jefe->name, $usuario->name, $id));
		} else if (\Auth::user()->rol == 5) {
			$oficio->finalizado = 1;
			$oficio->enviado = 1;
			$oficio->fecha_respuesta = date('Y-m-d H:i:s');
		}

		$oficio->descripcion_rechazo_jefe = null;
		$oficio->descripcion_rechazo_final = null;
		$oficio->save();

		return to_route('misOficios');
	}

	public function viewResp($id)
	{

		$archivos = ArchivoOficio::select('id', 'nombre', 'archivo')
			->where('id_nuevo_oficio', $id)
			->get()
			->map(function ($archivo) {
				$extension = pathinfo($archivo->archivo, PATHINFO_EXTENSION);

				if ($extension == "pdf" || $extension == "jpg" || $extension == "jpeg" || $extension == "png") {
					$tipo = 1;
					$url = $archivo->archivo;
				} else {
					$url = asset("files/" . $archivo->archivo);
					$tipo = 2;
				}

				return [
					'id' => $archivo->id,
					'tipo' => $tipo,
					'url' => $url,
					'nombre' => $archivo->nombre,
					'extension' => $extension,
				];
			});

		$oficio = Nuevo::find($id);

		$destinatarios = DestinatarioOficio::select(
			'destinatarios_oficio.id',
			DB::raw("COALESCE(directorios.nombre, cat_destinatarios_externos.nombre) as nombre"),
			DB::raw("COALESCE(directorios.cargo, cat_destinatarios_externos.cargo) as cargo"),
			DB::raw("COALESCE(directorios.dependencia, cat_destinatarios_externos.dependencia) as dependencia"),
			'destinatarios_oficio.tipo_usuario',
			'destinatarios_oficio.id_usuario'
		)
			->leftJoin('directorios', function ($join) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw("1"));
				$join->on('destinatarios_oficio.id_usuario', '=', 'directorios.id');
			})
			->leftJoin('cat_destinatarios_externos', function ($join) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw("2"));
				$join->on('destinatarios_oficio.id_usuario', '=', 'cat_destinatarios_externos.id');
			})
			->where('destinatarios_oficio.id_oficio', $id)
			->orderBy('destinatarios_oficio.id', 'desc')
			->get();

		return Inertia::render('Oficios/RevisaNuevo', [
			'status' => session('status'),
			'id' => $id,
			'archivos' => $archivos,
			'destinatariosOficio' => $destinatarios,
			'oficio' => $oficio,
		]);
	}

	public function detalleOficio($id)
	{

		$oficio = Nuevo::find($id);

		$destinatarios = DestinatarioOficio::select(
			'destinatarios_oficio.id',
			DB::raw("COALESCE(directorios.nombre, cat_destinatarios_externos.nombre) as nombre"),
			DB::raw("COALESCE(directorios.cargo, cat_destinatarios_externos.cargo) as cargo"),
			DB::raw("COALESCE(directorios.dependencia, cat_destinatarios_externos.dependencia) as dependencia"),
			'destinatarios_oficio.tipo_usuario',
			'destinatarios_oficio.id_usuario'
		)
			->leftJoin('directorios', function ($join) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw("1"));
				$join->on('destinatarios_oficio.id_usuario', '=', 'directorios.id');
			})
			->leftJoin('cat_destinatarios_externos', function ($join) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw("2"));
				$join->on('destinatarios_oficio.id_usuario', '=', 'cat_destinatarios_externos.id');
			})
			->where('destinatarios_oficio.id_oficio', $id)
			->orderBy('destinatarios_oficio.id', 'desc')
			->get();

		$archivos = ArchivoOficio::select('id', 'nombre', 'archivo')
			->where('id_nuevo_oficio', $id)
			->get()
			->map(function ($archivo) {
				$extension = pathinfo($archivo->archivo, PATHINFO_EXTENSION);

				if ($extension == "pdf" || $extension == "jpg" || $extension == "jpeg" || $extension == "png") {
					$tipo = 1;
					$url = $archivo->archivo;
				} else {
					$url = asset("files/" . $archivo->archivo);
					$tipo = 2;
				}

				return [
					'id' => $archivo->id,
					'tipo' => $tipo,
					'url' => $url,
					'nombre' => $archivo->nombre,
					'extension' => $extension,
				];
			});

		return Inertia::render('Oficios/DetalleNuevoOficio', [
			'id' => $id,
			'destinatariosOficio' => $destinatarios,
			'oficio' => $oficio,
			'archivos' => $archivos,
		]);
	}




	public function cancelar(Request $request, int $id)
	{
		// A) Motivo obligatorio:
		// $validated = $request->validate(['motivo' => ['required','string','min:3','max:1000']]);

		// B) Motivo opcional:
		$validated = $request->validate(['motivo' => ['nullable', 'string', 'max:1000']]);

		$user = $request->user(); // ✅ ahora sí definimos $user

		// (Opcional) Autorización por rol
		if (!in_array((int)$user->rol, [3, 4])) {
			abort(403, 'No autorizado para cancelar oficios.');
		}

		$oficio = Nuevo::query()->findOrFail($id);

		if (!is_null($oficio->enviado) || !is_null($oficio->finalizado)) {
			return back()->withErrors(['message' => 'El oficio ya fue enviado o finalizado y no puede cancelarse.']);
		}

		if (!is_null($oficio->deleted_at)) {
			return back()->withErrors(['message' => 'El oficio ya está cancelado.']);
		}

		$motivo = trim((string) ($validated['motivo'] ?? ''));
		$stamp  = now()->format('Y-m-d H:i');
		$autor  = trim((string) ($user->name ?? $user->email ?? 'usuario'));

		$comentarioActual = (string) ($oficio->comentario ?? '');
		$nuevoComentario  = 'CANCELADO: ' . $stamp . ' - ' . $autor
			. ($motivo !== '' ? ' | Motivo: ' . $motivo : '');

		DB::transaction(function () use ($oficio, $nuevoComentario, $comentarioActual) {
			$oficio->comentario = $nuevoComentario
				. ($comentarioActual !== '' ? ("\n" . $comentarioActual) : '');
			$oficio->save();   // guarda comentario

			// 2) SOFT DELETE de destinatarios del oficio
			DB::table('destinatarios_oficio')
				->where('id_oficio', $oficio->id)
				->whereNull('deleted_at')                  // evita reescribir si ya estaba
				->update([
					'deleted_at' => now(),
					'updated_at' => now(),                 // si la tabla tiene updated_at
				]);
			$oficio->delete(); // soft delete (deleted_at)
		});

		return back()->with('status', 'cancelado');
	}


	public function subeConfirmacionRecibidos($id)
	{
		$destinatarios = DestinatarioOficio::select(
			'destinatarios_oficio.id',
			DB::raw("COALESCE(directorios.nombre, cat_destinatarios_externos.nombre) as nombre"),
			DB::raw("COALESCE(directorios.cargo, cat_destinatarios_externos.cargo) as cargo"),
			DB::raw("COALESCE(directorios.dependencia, cat_destinatarios_externos.dependencia) as dependencia"),
			'destinatarios_oficio.tipo_usuario',
			'destinatarios_oficio.id_usuario',
			'archivo_respuesta',
			DB::raw("RIGHT(archivo_respuesta, 3) as extension"),
		)
			->leftJoin('directorios', function ($join) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw("1"));
				$join->on('destinatarios_oficio.id_usuario', '=', 'directorios.id');
			})
			->leftJoin('cat_destinatarios_externos', function ($join) {
				$join->on('destinatarios_oficio.tipo_usuario', '=', DB::raw("2"));
				$join->on('destinatarios_oficio.id_usuario', '=', 'cat_destinatarios_externos.id');
			})
			->where('destinatarios_oficio.id_oficio', $id)
			->orderBy('destinatarios_oficio.id', 'desc')
			->get();



		return Inertia::render('Oficios/SubeConfirmacion', [
			'id' => $id,
			'destinatariosOficio' => $destinatarios,
		]);
	}

	public function aceptResp($id)
	{
		$oficio = Nuevo::find($id);
		$asis = User::where('rol', 5)->first();

		if (\Auth::user()->rol == 5) {
			$jefe = User::where('rol', 3)->where('id_area', $oficio->id_area)->first();

			$oficio->enviado = 1;
			$oficio->fecha_respuesta = date('Y-m-d H:i:s');

			$usuario = infoUsuario($oficio->id_usuario);

			$mail = Mail::to($jefe->email);
			if (!empty($usuario)) {
				$mail->cc($usuario->email);
			}
			$mail->later(now()->addSeconds(2), new Enviado(0, 0));
		} else {
			$usuario = infoUsuario($oficio->id_usuario);
			$oficio->finalizado = 1;
			Mail::to($usuario->email)->later(now()->addSeconds(1), new AceptaRespuestaJefe($usuario->name, 0, 0));
			Mail::to($asis->email)->later(now()->addSeconds(2), new JefeNuevo($asis->name, $id));
		}
		$oficio->save();

		if (\Auth::user()->rol == 3) {
			return to_route('misOficios');
		} else {
			return to_route('oficiosRespuestas');
		}
	}

	public function subeEvidenciaRecibido(Request $request)
	{
		ini_set('upload_max_filesize', '30M');
		ini_set('post_max_size', '30M');

		$request->validate([
			'archivo' => 'required|file|max:25600|mimes:pdf,jpg,png,jpeg',
		]);

		$archivo = 'recibido_oficios/' . time() . "_" . \Auth::user()->id . "_" . $request->archivo->getClientOriginalName();
		$path = \Storage::disk('files')->put($archivo, \File::get($request->archivo));

		$oficio = Nuevo::find($request->id);
		$oficio->archivo_respuesta = $archivo;
		$oficio->save();


		return back()->with('status', "Se guardo la respuesta del oficio.");
	}

	public function rechazarResp(Request $request)
	{
		$request->validate([
			'descripcion' => 'required|min:2|max:500',
		]);

		$oficio = Nuevo::find($request->id);
		$usuario = infoUsuario($oficio->id_usuario);



		if (\Auth::user()->rol == 3) {
			$oficio->descripcion_rechazo_jefe = $request->descripcion;
			$oficio->finalizado = null;
			$oficio->revision = 0;

			Mail::to($usuario->email)->later(now()->addSeconds(1), new RechazoRespuestaJefe(0, $request->descripcion, $usuario->name, $request->id, 0));
		} else {
			$oficio->descripcion_rechazo_final = $request->descripcion;
			$oficio->descripcion_rechazo_jefe = null;
			$oficio->finalizado = null;

			if ($oficio->id_usuario != null) {
				$oficio->revision = 0;
			}




			$jefe = User::where('rol', 3)->where('id_area', $oficio->id_area)->first();
			Mail::to($jefe->email)->later(now()->addSeconds(1), new RechazoRespuestaFinal($jefe->name, 0, $request->descripcion, $request->id, 'jefe', $oficio->id_usuario, 0));

			if (!empty($usuario)) {
				Mail::to($usuario->email)->later(now()->addSeconds(3), new RechazoRespuestaFinal($usuario->name, 0, $request->descripcion, $request->id, 'colaborador', $oficio->id_usuario, 0));
			}
		}


		$oficio->save();

		if (\Auth::user()->rol == 3) {
			return to_route('misOficios');
		} else {
			return to_route('oficiosRespuestas');
		}
	}


	public function saveGrupal($numero)
	{

		$ultimo = Variables::where('variable', 'Oficio')->first();
		$del = ($ultimo->valor + 1);
		$al = ($ultimo->valor + $numero);

		Variables::where('variable', 'Oficio')->update(['valor' => $al]);

		$jefe = User::select('iniciales')->where('rol', 3)->where('id_area', \Auth::user()->id_area)->first();


		$nuevo = new Nuevo();
		$nuevo->folios_masivos = "del $del al $al";
		$nuevo->id_area = \Auth::user()->id_area;
		$nuevo->iniciales_area = $jefe->iniciales;
		$nuevo->id_usuario = \Auth::user()->rol == 4 ? \Auth::user()->id : null;
		$nuevo->iniciales_proceso =  \Auth::user()->rol == 4 ? \Auth::user()->iniciales : null;
		$nuevo->masivo = 1;
		if (\Auth::user()->rol == 3) {
			$nuevo->revision = 1;
		}
		$nuevo->save();

		return redirect()->route('nuevoOficio', ['id' => $nuevo->id])->with('status', "Se asigno el folio al oficio.");
	}

	public function saveNuevoOficioGrupal(Request $request)
	{
		ini_set('upload_max_filesize', '30M');
		ini_set('post_max_size', '30M');

		$oficio = Nuevo::find($request->id);
		if (!$oficio) {
			return back()->with('error', "No se encontro el oficio." . '|' . time());
		}

		$valid = $oficio->archivo == null ? 'required' : 'nullable';

		$request->validate([
			'descripcion' => 'required|min:2|max:2000',
			'archivo' => $valid . '|file|max:25600|mimes:pdf,doc,docx',
		]);


		$oficio->descripcion = $request->descripcion;

		if ($request->file('archivo')) {
			$archivo = 'adjuntos_oficios/' . time() . "_" . \Auth::user()->id . "_" . $request->archivo->getClientOriginalName();
			$path = \Storage::disk('files')->put($archivo, \File::get($request->archivo));
			$oficio->archivo = $archivo;
		}



		$jefe = User::where('rol', 3)->where('id_area', $oficio->id_area)->first();

		if (\Auth::user()->rol == 3) {
			$oficio->revision = 1;
			$oficio->finalizado = 1;

			$asis = User::where('rol', 5)->first();
			Mail::to($asis->email)->later(now()->addSeconds(2), new JefeNuevo($asis->name, $request->id));
		} else if (\Auth::user()->rol == 4 || \Auth::user()->rol == 2) {
			$oficio->revision = 1;
			$usuario = infoUsuario($oficio->id_usuario);
			Mail::to($jefe->email)->later(now()->addSeconds(2), new ColaboradorNuevo($jefe->name, $usuario->name, $request->id));
		} else if (\Auth::user()->rol == 5) {
			$oficio->finalizado = 1;
			$oficio->enviado = 1;
			$oficio->fecha_respuesta = date('Y-m-d H:i:s');
		}

		$oficio->descripcion_rechazo_jefe = null;
		$oficio->descripcion_rechazo_final = null;
		$oficio->save();

		return to_route('misOficios');
	}


	public function saveDestinatario(Request $request)
	{
		$pivot = 'destinatarios_oficio';

		// ¿Viene en formato "batch" (array) o "uno por uno"?
		$isBatch = $request->has('destinatarios') && is_array($request->input('destinatarios'));

		if ($isBatch) {
			// ====== BATCH: { id_oficio, destinatarios: [{id, tipo}, ...] } ======
			$validated = $request->validate([
				'id_oficio'                   => ['required', 'integer', 'exists:nuevos_oficios,id'],
				'destinatarios'               => ['required', 'array', 'min:1'],
				'destinatarios.*.id'          => ['required', 'integer'],
				'destinatarios.*.tipo'        => ['required', Rule::in(['1', '2'])],
			]);

			DB::transaction(function () use ($validated, $pivot) {
				foreach ($validated['destinatarios'] as $d) {
					$idUsuario   = (int) $d['id'];
					$tipoUsuario = (int) $d['tipo'];

					// ¿Ya existe (sin soft-delete)?
					$existe = DB::table($pivot)
						->where('id_oficio',    $validated['id_oficio'])
						->where('id_usuario',   $idUsuario)
						->where('tipo_usuario', $tipoUsuario)
						->whereNull('deleted_at')
						->exists();

					if ($existe) {
						continue; // NO generar otro folio
					}

					// Folio atómico
					$v = Variables::where('variable', 'Oficio')->lockForUpdate()->first();
					$folio = ((int)$v->valor) + 1;
					$v->valor = $folio;
					$v->save();

					DB::table($pivot)->insert([
						'id_oficio'    => $validated['id_oficio'],
						'id_usuario'   => $idUsuario,
						'tipo_usuario' => $tipoUsuario,
						'folio'        => $folio,
						'created_at'   => now(),
						'updated_at'   => now(),
					]);
				}
			});

			// Inertia flow: vuelve a la misma página con flash
			return back()->with('status', 'destinatarios-guardados');
		}

		// ====== UNO POR UNO: { id_oficio, id, tipo } ======
		$data = $request->validate([
			'id_oficio' => ['required', 'integer', 'exists:nuevos_oficios,id'],
			'id'        => ['required', 'integer'],
			'tipo'      => ['required', Rule::in(['1', '2'])],
		]);

		$idOficio    = (int) $data['id_oficio'];
		$idUsuario   = (int) $data['id'];
		$tipoUsuario = (int) $data['tipo'];

		// Si ya existe, no generes otro folio
		$existente = DB::table($pivot)
			->where('id_oficio',    $idOficio)
			->where('id_usuario',   $idUsuario)
			->where('tipo_usuario', $tipoUsuario)
			->whereNull('deleted_at')
			->first();

		if ($existente) {
			// Mantén flujo Inertia "éxito" (no 422) para que tu front lo cuente como OK
			return back()->with('status', 'destinatario-ya-existia');
		}

		// Crear nuevo con folio atómico
		DB::transaction(function () use ($idOficio, $idUsuario, $tipoUsuario, $pivot) {
			$v = Variables::where('variable', 'Oficio')->lockForUpdate()->first();
			$folio = ((int)$v->valor) + 1;
			$v->valor = $folio;
			$v->save();

			DB::table($pivot)->insert([
				'id_oficio'    => $idOficio,
				'id_usuario'   => $idUsuario,
				'tipo_usuario' => $tipoUsuario,
				'folio'        => $folio,
				'created_at'   => now(),
				'updated_at'   => now(),
			]);
		});

		return back()->with('status', 'destinatario-guardado');
	}


	public function deleteDestinatario($id)
	{
		$elimina = DestinatarioOficio::find($id);
		if ($elimina) {
			$elimina->delete();
			return back()->with('status', "Se elimino el destinatario.");
		}
		return back()->with('error', "No se encontro el destinatario.");
	}
}
