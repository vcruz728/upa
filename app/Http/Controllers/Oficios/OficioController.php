<?php

namespace App\Http\Controllers\Oficios;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Oficios\Oficio;
use App\Models\Oficios\Copia;
use App\Models\Oficios\ArchivoOficio;
use App\Models\Oficios\RespuestaOficio;
use App\Models\Oficios\Nuevo as NuevoOficio;
use App\Models\Oficios\DestinatarioOficio;
use App\Models\Catalogos\Des;
use App\Models\Catalogos\Areas;
use App\Models\Catalogos\Procesos;
use App\Models\Catalogos\DestinatarioExterno;
use App\Models\Directorio\Directorio;
use App\Models\Variables;
use Inertia\Inertia;
use Illuminate\Support\Facades\Mail;
use App\Mail\Oficios\Nuevo;
use App\Mail\Oficios\Rechazo;
use App\Mail\Oficios\ColaboradorRespuesta;
use App\Mail\Oficios\RechazoRespuestaJefe;
use App\Mail\Oficios\AceptaRespuestaJefe;
use App\Mail\Oficios\RespuestaOficio as MailRespuestaOficio;
use App\Mail\Oficios\RechazoRespuestaFinal;
use App\Mail\Oficios\Enviado;
use DB;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\User;
use App\Helpers\TiempoHabil;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use App\Support\FilenameSanitizer as FS;
use Illuminate\Support\Facades\Auth;
use App\Helpers\PdfHtml;



class OficioController extends Controller
{


	private function makeFilePayload(ArchivoOficio $a): array
	{
		$relative = FS::cleanPath((string)($a->archivo ?? ''));
		$exists   = $relative !== '' && Storage::disk('files')->exists($relative);

		$ext = strtolower(
			pathinfo($relative, PATHINFO_EXTENSION)
				?: pathinfo((string)$a->nombre, PATHINFO_EXTENSION)
				?: ''
		);

		$display = (string)($a->nombre ?? '');
		if ($display === '') {
			$basename  = pathinfo($relative, PATHINFO_BASENAME);
			$nameOnly  = pathinfo($basename, PATHINFO_FILENAME);
			$display   = FS::cleanBase($nameOnly) . ($ext ? '.' . $ext : '');
		} else {
			$nameOnly  = pathinfo($display, PATHINFO_FILENAME);
			$display   = FS::cleanBase($nameOnly) . ($ext ? '.' . $ext : '');
		}

		$previewable = in_array($ext, ['pdf', 'jpg', 'jpeg', 'png'], true);
		$tipo        = $previewable ? 1 : 2;

		// ⬇⬇ USAR el FilesController (/files/...) en lugar de Storage::url()
		$url = $exists ? url('/files/' . ltrim($relative, '/')) : null;

		return [
			'id'        => (int) $a->id,
			'nombre'    => $display,
			'url'       => $url,
			'tipo'      => $tipo,
			'extension' => $ext,
			'exists'    => $exists ? 1 : 0,
			'file'      => $relative,
		];
	}

	private function makeFilePondPayload(ArchivoOficio $a): array
	{
		$relative = FS::cleanPath((string)($a->archivo ?? ''));
		$exists   = $relative !== '' && Storage::disk('files')->exists($relative);

		$size = $exists ? Storage::disk('files')->size($relative) : 0;
		$path = $exists ? Storage::disk('files')->path($relative) : null;

		$mime = 'application/octet-stream';
		if ($path) {
			try {
				$mime = mime_content_type($path) ?: $mime;
			} catch (\Throwable $e) {
			}
		}

		$ext = strtolower(pathinfo($relative, PATHINFO_EXTENSION) ?: '');
		$name = $a->nombre ?: pathinfo($relative, PATHINFO_BASENAME);

		// URL pública usando tu FilesController (/files/...)
		$url = $exists ? url('/files/' . ltrim($relative, '/')) : null;

		return [
			'serverId' => (string)$a->id,  // lo que tu endpoint de delete espera
			'source'   => (string)$a->id,  // idem
			'origin'   => 'local',
			'options'  => [
				'type' => 'local',
				'file' => [
					'name' => $name,
					'size' => $size,
					'type' => $mime,
				],
				'metadata' => [
					'url'       => $url,
					'extension' => $ext,
				],
			],
		];
	}


	private function semaforoOficio(?string $createdAt, ?string $fechaRespuesta, int $minutosOficio): array
	{
		// horas objetivo según área (ej. 4320 min = 72 h)
		$horas = (int) ceil(max($minutosOficio, 0) / 60);

		$inicio = Carbon::parse($createdAt ?? now());
		$vence  = TiempoHabil::sumarHorasExcluyendoDescansos($inicio, $horas, true);

		if (!empty($fechaRespuesta)) {
			$resp = Carbon::parse($fechaRespuesta);
			if ($resp->lte($vence)) {
				return [1, '#5fd710', $vence]; // verde (cumplido a tiempo)
			}
			return [4, '#ff2d2d', $vence];     // rojo (cumplido fuera de tiempo)
		}

		// sin respuesta
		if (now()->lte($vence)) {
			return [2, '#f5f233', $vence];     // amarillo (en tiempo)
		}
		return [3, '#f98200', $vence];         // naranja (vencido sin respuesta)
	}

	public function index()
	{
		// 1) Subconsultas de respuestas (sin cambios)
		$ultResp = DB::table('respuestas_oficio as r')
			->select([
				'r.id_oficio',
				'r.respuesta',
				'r.nombre',
				DB::raw('r.oficio_respuesta as oficio_respuesta_all'),
				DB::raw('ROW_NUMBER() OVER (PARTITION BY r.id_oficio ORDER BY r.fecha_respuesta DESC, r.id DESC) AS rn'),
			]);

		$ultRespFolio = DB::table('respuestas_oficio as r')
			->whereNotNull('r.oficio_respuesta')
			->whereRaw("LTRIM(RTRIM(CAST(r.oficio_respuesta AS VARCHAR(100)))) <> ''")
			->select([
				'r.id_oficio',
				'r.oficio_respuesta',
				DB::raw('ROW_NUMBER() OVER (PARTITION BY r.id_oficio ORDER BY r.fecha_respuesta DESC, r.id DESC) AS rn'),
			]);

		// 2) Activos — excluye informativos históricos
		$oficios = Oficio::select(
			DB::raw("CONCAT(
				RIGHT('0'+cast(DAY(oficios.created_at) as varchar(2)),2),
				' de ', dbo.fn_GetMonthName (oficios.created_at, 'Spanish'),
				' de ', YEAR(oficios.created_at),
				' ', CONVERT(VARCHAR(5),oficios.created_at,108)
			) as f_ingreso"),
			DB::raw("CONVERT(VARCHAR(19), oficios.created_at, 120) as f_ingreso_raw"),
			DB::raw("CONVERT(VARCHAR(19), oficios.fecha_respuesta, 120) as f_respuesta_raw"),
			//DB::raw("cat_areas.minutos_oficio as sla_min"),
			DB::raw("COALESCE(cat_procesos.minutos_oficio, cat_areas.minutos_oficio, 4320) as sla_min"),


			'oficios.id',
			'num_folio',
			'num_oficio',
			DB::raw("CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio"),
			'cat_des.nombre as des',
			'cat_areas.nombre as area',
			'cat_procesos.nombre as proceso',
			'dep_ua',
			'area as id_area',
			DB::raw("
				CASE 
					WHEN (oficios.id_usuario IS NULL OR oficios.id_usuario = 0)
						AND oficios.area BETWEEN 2 AND 11
					THEN (
						SELECT TOP 1 u.name
						FROM users u
						WHERE u.rol = 3
						AND u.id_area = oficios.area
						ORDER BY u.id ASC
					)
					ELSE ISNULL(users.name, '')
				END as responsable
			"),
			'oficios.id_usuario',
			'proceso_impacta',
			'descripcion',
			'oficios.archivo',
			'oficios.descripcion_respuesta',
			'oficios.archivo_respuesta',
			'oficios.descripcion_rechazo',
			'oficios.finalizado',
			'oficios.respuesta',
			'oficios.oficio_final',
			'oficios.descripcion_rechazo_jefe',
			'descripcion_rechazo_final',
			DB::raw("RIGHT(oficios.archivo_respuesta, 3) as extension"),
			DB::raw("COALESCE(rof.oficio_respuesta, ro.oficio_respuesta_all, '') as folio_respuesta"),
			DB::raw("COALESCE(ro.nombre,'') as destinatario"),
			DB::raw("COALESCE(ro.respuesta,'') as asunto"),
			't3.total_inicial',
			't4.total_respuesta',
			'oficios.informativo',
			'oficios.requiere_atencion'
		)
			->join('cat_des', 'cat_des.id', 'oficios.dep_ua')
			->join('cat_areas', 'cat_areas.id', 'oficios.area')
			->leftJoin('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')
			->leftJoin('users', 'users.id', 'oficios.id_usuario')

			->leftJoinSub($ultResp, 'ro', function ($join) {
				$join->on('ro.id_oficio', '=', 'oficios.id')->where('ro.rn', '=', 1);
			})
			->leftJoinSub($ultRespFolio, 'rof', function ($join) {
				$join->on('rof.id_oficio', '=', 'oficios.id')->where('rof.rn', '=', 1);
			})
			->leftJoin(
				DB::raw("(SELECT COUNT(id) as total_inicial, id_oficio_inicial
                  FROM archivos_oficios
                  WHERE id_nuevo_oficio IS NULL AND id_oficio IS NULL
                  GROUP BY id_oficio_inicial) as t3"),
				't3.id_oficio_inicial',
				'oficios.id'
			)
			->leftJoin(
				DB::raw("(SELECT COUNT(id) as total_respuesta, id_oficio
                  FROM archivos_oficios
                  WHERE id_nuevo_oficio IS NULL AND id_oficio_inicial IS NULL
                  GROUP BY id_oficio) as t4"),
				't4.id_oficio',
				'oficios.id'
			)
			// filtros por rol, informativo, etc.
			->when(auth()->user()->rol == 3, function ($q) {
				$q->where(function ($w) {
					$w->where('oficios.area', auth()->user()->id_area)
						->orWhere('oficios.area', 1);
				});
			})
			->when(auth()->user()->rol == 4, function ($q) {
				$q->where(function ($w) {
					$w->where('oficios.id_usuario', auth()->id());
				});
			})
			->where(function ($q) {
				$q->where('oficios.informativo', 0)
					->orWhere(function ($w) {
						$w->where('oficios.informativo', 1)
							->where('oficios.requiere_atencion', 1)
							->where('oficios.id_usuario', auth()->id());
					});
			})
			->when(in_array(auth()->user()->rol, [1, 3]), function ($q) {
				$q->where('oficios.area', auth()->user()->id_area);
			})
			->orderByDesc('oficios.created_at')
			->get();


		$oficios = $oficios->map(function ($o) {
			[$estatus, $color, $vence] = $this->semaforoOficio(
				$o->f_ingreso_raw ?? null,
				$o->f_respuesta_raw ?? null,
				(int) ($o->sla_min ?? 4320)
			);

			// ✅ Informativo si: (id_area == 1) OR (informativo == 1)
			$esInformativo = ((int)($o->id_area ?? 0) === 1) || ((int)($o->informativo ?? 0) === 1);

			if ($esInformativo) {
				// Estatus especial informativo (azul)
				$estatus = 0;
				$color   = '#2b0dbdff';
			}

			$o->estatus_valor = $estatus;
			$o->color         = $color;
			$o->vence_real    = $vence->format('Y-m-d H:i:s');
			$o->es_informativo = $esInformativo ? 1 : 0; // 👉 bandera explícita para el front

			return $o;
		});

		// 3) Selects auxiliares
		$procesos = Procesos::getSelForArea(auth()->user()->id_area);
		$usuarios = User::getSel(auth()->user()->id_area);

		$destAgg = DB::table('destinatarios_oficio as d')
			->leftJoin('directorios as dir', 'dir.id', '=', 'd.id_usuario')
			->leftJoin('cat_destinatarios_externos as ext', 'ext.id', '=', 'd.id_usuario')
			->whereNull('d.deleted_at')
			->groupBy('d.id_oficio')
			->selectRaw("
            d.id_oficio,
            COUNT(*) AS total_dest,
            STRING_AGG(CAST(d.folio AS varchar(10)), ', ') AS folios,
            MAX(d.folio) AS folio,
            CASE
                WHEN COUNT(*) = 1
                     THEN MAX(CASE WHEN d.tipo_usuario = 1 THEN dir.nombre
                                   WHEN d.tipo_usuario = 2 THEN ext.nombre
                              END)
                ELSE 'Multi Destinatario'
            END AS nombre_desti
        ");

		$t3 = DB::table('archivos_oficios as a')
			->whereNull('a.id_oficio_inicial')
			->whereNull('a.id_oficio')
			->groupBy('a.id_nuevo_oficio')
			->selectRaw('COUNT(a.id) AS total_nuevo, a.id_nuevo_oficio');

		// 4) Nuevos oficios
		$nuevos = NuevoOficio::query()
			->from('nuevos_oficios')
			->select([
				'nuevos_oficios.id',
				'cat_areas.nombre as area',
				'nuevos_oficios.nombre as destinatario',
				'nuevos_oficios.archivo_respuesta',
				'enviado',
				'finalizado',
				'revision',
				'id_usuario',
				'descripcion_rechazo_jefe',
				'descripcion_rechazo_final',
				'archivo',
				DB::raw('COALESCE(respuesta, descripcion) AS respuesta'),
				'masivo',
				DB::raw("
					COALESCE(
						NULLIF(LTRIM(RTRIM(CAST(nuevos_oficios.oficio_respuesta AS VARCHAR(200)))), ''),
						NULLIF(LTRIM(RTRIM(CASE WHEN dest.total_dest = 1
												THEN CAST(dest.folio AS VARCHAR(200))
												ELSE dest.folios
										END)), ''),
						NULLIF(LTRIM(RTRIM(nuevos_oficios.folios_masivos)), '')
					) AS oficio_respuesta
				"),
				DB::raw("
					CASE 
						WHEN nuevos_oficios.masivo = 1 THEN 'Grupal'
						ELSE COALESCE(dest.nombre_desti, '')
					END AS nombre_desti
				"),
				DB::raw("CONCAT(
					RIGHT('0' + CAST(DAY(nuevos_oficios.created_at) AS varchar(2)), 2),
					' de ', dbo.fn_GetMonthName(nuevos_oficios.created_at, 'Spanish'),
					' de ', YEAR(nuevos_oficios.created_at),
					' ', CONVERT(VARCHAR(5), nuevos_oficios.created_at, 108)
					) AS f_ingreso"),
				DB::raw("CONVERT(VARCHAR(19), nuevos_oficios.created_at, 120) as f_ingreso_raw"),

				DB::raw('RIGHT(nuevos_oficios.archivo_respuesta, 3) AS extension'),
				't3.total_nuevo',

			])
			->join('cat_areas', 'cat_areas.id', '=', 'nuevos_oficios.id_area')
			->leftJoinSub($t3, 't3', function ($join) {
				$join->on('t3.id_nuevo_oficio', '=', 'nuevos_oficios.id');
			})
			->leftJoinSub($destAgg, 'dest', function ($join) {
				$join->on('dest.id_oficio', '=', 'nuevos_oficios.id');
			})
			->when(auth()->user()->rol == 3, function ($q) {
				$q->where('nuevos_oficios.id_area', auth()->user()->id_area)
					->where('nuevos_oficios.revision', 1);
			})
			->when(auth()->user()->rol == 4, function ($q) {
				$q->where('nuevos_oficios.id_usuario', auth()->id());
			})
			->orderByDesc('nuevos_oficios.created_at')
			->get();

		// Post-proceso de oficio_respuesta
		$nuevos = $nuevos->map(function ($item) {
			$val = trim((string)($item->oficio_respuesta ?? ''));

			if ($val === '') {
				return $item;
			}

			// Si viene ya como rango (e.g. "2320-2330") y no hay comas, lo dejamos
			if (strpos($val, ',') === false && strpos($val, '-') !== false) {
				$item->oficio_respuesta = $val;
				return $item;
			}

			// Caso lista separada por comas -> normalizamos y convertimos a rangos
			$folios = array_map('trim', explode(',', $val));
			$folios = array_values(array_filter($folios, fn($x) => ctype_digit($x)));
			sort($folios, SORT_NUMERIC);

			if (count($folios) === 0) {
				// Nada válido, dejamos el valor original
				$item->oficio_respuesta = $val;
				return $item;
			}

			// Si son pocos, muéstralos todos tal cual
			if (count($folios) <= 5) {
				$item->oficio_respuesta = implode(', ', $folios);
				return $item;
			}

			// Compactar en rangos
			$rango = [];
			$inicio = $prev = null;
			foreach ($folios as $folio) {
				$folio = (int)$folio;
				if ($inicio === null) {
					$inicio = $prev = $folio;
					continue;
				}
				if ($folio === $prev + 1) {
					$prev = $folio;
					continue;
				}
				$rango[] = ($inicio === $prev) ? (string)$inicio : ($inicio . '-' . $prev);
				$inicio = $prev = $folio;
			}
			if ($inicio !== null) {
				$rango[] = ($inicio === $prev) ? (string)$inicio : ($inicio . '-' . $prev);
			}

			$item->oficio_respuesta = implode(', ', $rango);
			return $item;
		});

		if (auth()->user()->rol == 6) {
			// Informativos (area = 1)
			$informativos = Oficio::select(
				DB::raw("CONCAT( RIGHT('0'+cast(DAY(oficios.created_at) as varchar(2)),2) ,' de ', dbo.fn_GetMonthName (oficios.created_at, 'Spanish'),' de ',YEAR(oficios.created_at),' ', CONVERT(VARCHAR(5),oficios.created_at,108)) as f_ingreso"),
				DB::raw("CONVERT(VARCHAR(19), oficios.created_at, 120) as f_ingreso_raw"),
				'oficios.id',
				'ingreso',
				'num_folio',
				'num_oficio',
				DB::raw(" CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio "),
				'area as id_area',
				'descripcion',
				'oficios.archivo',
			)
				->orderBy('oficios.created_at', 'desc')
				->where('area', 1)
				->get();
		} else {

			// 5) INFORMÁTIVOS HISTÓRICOS — SOLO su área (rol 3) o sus oficios (rol 4)
			$informativos = Oficio::select(
				DB::raw("CONCAT(
			RIGHT('0'+cast(DAY(oficios.created_at) as varchar(2)),2),
			' de ', dbo.fn_GetMonthName (oficios.created_at, 'Spanish'),
			' de ',YEAR(oficios.created_at),' ', CONVERT(VARCHAR(5),oficios.created_at,108)
			) as f_ingreso"),
				DB::raw("CONVERT(VARCHAR(19), oficios.created_at, 120) as f_ingreso_raw"),

				'oficios.id',
				'num_folio',
				'num_oficio',
				DB::raw("CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio"),
				'cat_des.nombre as des',
				'cat_areas.nombre as area',
				'cat_procesos.nombre as proceso',
				'dep_ua',
				'area as id_area',
				DB::raw("coalesce(users.name,'' ) as responsable"),
				'oficios.id_usuario',
				'proceso_impacta',
				'descripcion',
				'oficios.archivo',
				'oficios.descripcion_respuesta',
				'oficios.archivo_respuesta',
				'oficios.descripcion_rechazo',
				'oficios.finalizado',
				'oficios.respuesta',
				'oficios.oficio_final',
				'oficios.descripcion_rechazo_jefe',
				'descripcion_rechazo_final',
				DB::raw("RIGHT(oficios.archivo_respuesta, 3) as extension")
			)
				->join('cat_des', 'cat_des.id', 'oficios.dep_ua')
				->join('cat_areas', 'cat_areas.id', 'oficios.area')
				->leftJoin('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')
				->leftJoin('users', 'users.id', 'oficios.id_usuario')
				// ✅ ahora: históricos "puros" + informativo+atención asignados a otro
				->where(function ($q) {
					$q->where(function ($x) {
						$x->where('oficios.informativo', 1)
							->where('oficios.requiere_atencion', 0);
					})
						->orWhere(function ($x) {
							$x->where('oficios.informativo', 1)
								->where('oficios.requiere_atencion', 1)
								->where('oficios.id_usuario', '<>', auth()->id());
							// ->orWhereNull('oficios.id_usuario'); // (opcional)
						});
				})
				// filtros por rol (igual que ya los tienes)
				->when(in_array(auth()->user()->rol, [1, 3, 4]), function ($q) {
					$q->where('oficios.area', auth()->user()->id_area);
				})
				->orderByDesc('oficios.created_at')
				->get();
		}


		// 6) Render
		$common = [
			'status'         => session('status'),
			'oficios'        => $oficios,
			'usuariosSelect' => $usuarios,
			'procesos'       => $procesos,
			'nuevos'         => $nuevos,
			'informativos'   => $informativos,
			//'debug'          => [
			//   'rol' => auth()->user()->rol,
			//  'id_area' => auth()->user()->id_area,
			//],

		];

		if (auth()->user()->rol == 6) {
			return Inertia::render('Oficios/OficiosAdmin', $common);
		}
		return Inertia::render('Oficios/MisOficios', $common);
	}



	public function indexResp($id)
	{
		$bandera = Oficio::find($id);
		if ($bandera->respuesta > 0 && \Auth::user()->rol == 4) {
			return redirect()->route('dashboard')->withErrors(['error' => 'No cuenta con los permisos suficientes para acceder a la ruta']);
		} else if ($bandera->respuesta == 0 && $bandera->id_usuario !== null && \Auth::user()->rol != 4) {
			return redirect()->route('dashboard')->withErrors(['error' => 'No cuenta con los permisos suficientes para acceder a la ruta']);
		}

		$directorio = Directorio::select('id as value', 'nombre as label')->whereNotIn('id', function ($query) use ($id) {
			$query->select('id_directorio')->from('oficios_copias')->where('id_oficio', $id)->whereNotNull('id_directorio');
		})->orderBy('nombre')->get();

		$directorioAll = Directorio::getSel();

		$copy = Copia::select('id', 'id_oficio', 'id_directorio', 'nombre', 'cargo', 'dependencia')->where('id_oficio', $id)->get();

		$respuesta = RespuestaOficio::select('id', 'id_oficio', 'tipo_destinatario', 'nombre', 'cargo', 'dependencia', 'id_directorio', 'respuesta', 'comentario')
			->where('id_oficio', $id)
			->first();

		$archivos = ArchivoOficio::where('id_oficio', $id)
			->get()
			->map(function ($archivo) {
				return $this->makeFilePondPayload($archivo);
			});

		$externos = DestinatarioExterno::getSel();

		return Inertia::render('Oficios/ResponderOficio', ['status' => session('status'), 'externos' => $externos, 'oficio' => $bandera, 'files' => $archivos, 'directorio' => $directorio, 'copy' => $copy, 'respuesta' => $respuesta, 'directorioAll' => $directorioAll]);
	}
	public function viewResp($id)
	{
		// Subconsulta: última respuesta en respuestas_oficio (si existiera)
		$lastResp = DB::table('respuestas_oficio as r')
			->select([
				'r.id_oficio',
				'r.id as id_respuesta',
				'r.comentario',
				'r.fecha_respuesta',
				DB::raw('ROW_NUMBER() OVER (
                PARTITION BY r.id_oficio
                ORDER BY COALESCE(r.fecha_respuesta, r.created_at) DESC, r.id DESC
            ) as rn'),
			]);

		$oficio = Oficio::select(
			'oficios.id',
			'num_folio',
			'num_oficio',
			DB::raw("CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio"),
			'cat_des.nombre as des',
			'cat_areas.nombre as area',
			'cat_procesos.nombre as proceso',
			'dep_ua',
			'area as id_area',
			DB::raw("CONCAT(cat_procesos.nombre, CASE WHEN users.name IS NULL THEN '' ELSE ' / '+users.name END ) as responsable"),
			'oficios.id_usuario',
			'proceso_impacta',
			'oficios.descripcion',
			'oficios.archivo',
			'oficios.descripcion_respuesta',
			'oficios.archivo_respuesta',
			'oficios.descripcion_rechazo',
			'oficios.finalizado',
			'oficios.ingreso',

			// Tomar primero lo de respuestas_oficio (lr.*), y si no existe, usar nuevos_oficios (no.*)
			DB::raw('COALESCE(lr.comentario, no.comentario) as comentario_resp'),
			DB::raw('COALESCE(lr.id_respuesta, no.id) as id_respuesta'),
			DB::raw('COALESCE(lr.fecha_respuesta, no.fecha_respuesta) as fecha_respuesta_resp')
		)
			->join('cat_des', 'cat_des.id', 'oficios.dep_ua')
			->join('cat_areas', 'cat_areas.id', 'oficios.area')
			->join('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')
			->leftJoin('users', 'users.id', 'oficios.id_usuario')

			// LEFT JOIN a la última fila de respuestas_oficio
			->leftJoinSub($lastResp, 'lr', function ($join) {
				$join->on('lr.id_oficio', '=', 'oficios.id')
					->where('lr.rn', '=', 1);
			})

			// <-- AQUI el vínculo con nuevos_oficios (id == id_oficio)
			->leftJoin('nuevos_oficios as no', 'no.id', '=', 'oficios.id')

			->where('oficios.id', $id)
			->first();

		if (!$oficio) {
			abort(404);
		}

		// Evitar archivos vacíos que generan URL /files/
		$archivos = ArchivoOficio::select('id', 'nombre', 'archivo')
			->where('id_oficio', $id)
			->whereNotNull('archivo')
			->where('archivo', '<>', '')
			->get()
			->map(function ($archivo) {
				return $this->makeFilePayload($archivo);
			});
		return Inertia::render('Oficios/RevisaRespuesta', [
			'status'   => session('status'),
			'oficio'   => $oficio,
			'archivos' => $archivos,
		]);
	}



	public function viewOficiosResp()
	{
		// Subquery: última respuesta (para asunto/destinatario y fallback de folio)
		$ultResp = DB::table('respuestas_oficio as r')
			->select([
				'r.id_oficio',
				'r.respuesta',
				'r.nombre',
				DB::raw('r.oficio_respuesta as oficio_respuesta_all'),
				DB::raw('ROW_NUMBER() OVER (PARTITION BY r.id_oficio ORDER BY r.fecha_respuesta DESC, r.id DESC) AS rn'),
			]);

		// Subquery: última respuesta que SÍ tenga folio (para folio_respuesta)
		$ultRespFolio = DB::table('respuestas_oficio as r')
			->whereNotNull('r.oficio_respuesta')
			->whereRaw("LTRIM(RTRIM(CAST(r.oficio_respuesta AS VARCHAR(100)))) <> ''")
			->select([
				'r.id_oficio',
				'r.oficio_respuesta',
				DB::raw('ROW_NUMBER() OVER (PARTITION BY r.id_oficio ORDER BY r.fecha_respuesta DESC, r.id DESC) AS rn'),
			]);

		// -------- OFICIOS (finalizados o área 1) --------
		$oficios = Oficio::select(
			DB::raw("CONVERT(VARCHAR(19), oficios.created_at, 120) as f_ingreso_raw"),
			DB::raw("CONVERT(VARCHAR(19), oficios.fecha_respuesta, 120) as f_respuesta_raw"),
			DB::raw("cat_areas.minutos_oficio as sla_min"),

			DB::raw("CONCAT(
				RIGHT('0'+cast(DAY(oficios.created_at) as varchar(2)),2),
				' de ', dbo.fn_GetMonthName (oficios.created_at, 'Spanish'),
				' de ', YEAR(oficios.created_at),
				' ', CONVERT(VARCHAR(5),oficios.created_at,108)
			) as f_ingreso"),
			DB::raw("CONVERT(VARCHAR(19), oficios.created_at, 120) as f_ingreso_raw"),
			DB::raw("CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio"),
			'oficios.id',
			'num_folio',
			'num_oficio',
			'cat_des.nombre as des',
			'cat_areas.nombre as area',
			'cat_procesos.nombre as proceso',
			'descripcion',
			DB::raw("coalesce(users.name,'' ) as responsable"),
			'oficios.archivo',
			'oficios.area as id_area',
			'oficios.enviado',
			'oficios.archivo_respuesta',
			'oficios.oficio_final',
			DB::raw("RIGHT(oficios.archivo_respuesta, 3) as extension"),
			// folio de la última respuesta con folio; si no hay, intenta con la última respuesta
			DB::raw("COALESCE(rof.oficio_respuesta, ro.oficio_respuesta_all, '') as folio_respuesta"),
			DB::raw("COALESCE(ro.nombre,'') as destinatario"),
			// Asunto desde la última respuesta
			DB::raw("COALESCE(ro.respuesta,'') as asunto")
		)
			->join('cat_des', 'cat_des.id', 'oficios.dep_ua')
			->join('cat_areas', 'cat_areas.id', 'oficios.area')
			->leftJoin('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')
			->leftJoin('users', 'users.id', '=', 'oficios.id_usuario')   // <-- agrega esto
			->leftJoinSub($ultResp, 'ro', function ($join) {
				$join->on('ro.id_oficio', '=', 'oficios.id')->where('ro.rn', '=', 1);
			})
			->leftJoinSub($ultRespFolio, 'rof', function ($join) {
				$join->on('rof.id_oficio', '=', 'oficios.id')->where('rof.rn', '=', 1);
			})
			->where(function ($q) {
				$q->where('finalizado', 1)
					->orWhere('area', 1);
			})
			->orderBy('oficios.created_at', 'desc')
			->get();

		$oficios = $oficios->map(function ($o) {
			[$estatus, $color, $vence] = $this->semaforoOficio(
				$o->f_ingreso_raw ?? null,
				$o->f_respuesta_raw ?? null,
				(int) ($o->sla_min ?? 4320)
			);

			$o->estatus_valor = $estatus;
			$o->color         = $color;
			$o->vence_real    = $vence->format('Y-m-d H:i:s');

			return $o;
		});
		// -------- NUEVOS (VD) --------
		$nuevos = NuevoOficio::select(
			'nuevos_oficios.id',
			'cat_areas.nombre as area',
			'nuevos_oficios.nombre as destinatario',
			'nuevos_oficios.archivo_respuesta',
			'enviado',
			'finalizado',
			'masivo',

			// ✅ Folio con 3 niveles: oficio_respuesta -> folios de destinatarios (no eliminados) -> folios_masivos
			DB::raw("
				COALESCE(
					NULLIF(LTRIM(RTRIM(CAST(nuevos_oficios.oficio_respuesta AS VARCHAR(200)))), ''),
					NULLIF(LTRIM(RTRIM(
						CASE 
							WHEN folios.total = 1 THEN CAST(folios.folio AS VARCHAR(200))
							ELSE folios.folios
						END
					)), ''),
					NULLIF(LTRIM(RTRIM(nuevos_oficios.folios_masivos)), '')
				) as oficio_respuesta
   			 "),

			// ✅ 'Grupal' cuando masivo = 1; si no, nombre agregado (no eliminados)
			DB::raw("
			CASE 
				WHEN nuevos_oficios.masivo = 1 THEN 'Grupal'
				ELSE COALESCE(t1.nombre_desti, '')
			END AS nombre_desti
   			 "),

			DB::raw("CONCAT(
				RIGHT('0'+cast(DAY(nuevos_oficios.created_at) as varchar(2)),2),
				' de ', dbo.fn_GetMonthName (nuevos_oficios.created_at, 'Spanish'),
				' de ', YEAR(nuevos_oficios.created_at),
				' ', CONVERT(VARCHAR(5),nuevos_oficios.created_at,108)
			) as f_ingreso"),
			DB::raw("CONVERT(VARCHAR(19), nuevos_oficios.created_at, 120) as f_ingreso_raw"),
			DB::raw("RIGHT(nuevos_oficios.archivo_respuesta, 3) as extension"),
			DB::raw("COALESCE(respuesta, descripcion) as respuesta"),

			// (opcional) bandera para la UI
			DB::raw('CASE WHEN nuevos_oficios.masivo = 1 THEN 1 ELSE 0 END AS es_masivo')
		)
			->join('cat_areas', 'cat_areas.id', '=', 'nuevos_oficios.id_area')

			/* nombre_desti: SOLO destinatarios no eliminados */
			->leftJoin(DB::raw("(
				SELECT 
					d.id_oficio,
					CASE 
						WHEN COUNT(*) = 1 THEN
							MAX(CASE WHEN d.tipo_usuario = 1 THEN dir.nombre
									WHEN d.tipo_usuario = 2 THEN ext.nombre
								END)
						WHEN COUNT(*) > 1 THEN 'Multi Destinatario'
						ELSE '' 
					END AS nombre_desti
				FROM destinatarios_oficio d
				LEFT JOIN directorios dir ON dir.id = d.id_usuario AND d.tipo_usuario = 1
				LEFT JOIN cat_destinatarios_externos ext ON ext.id = d.id_usuario AND d.tipo_usuario = 2
				WHERE d.deleted_at IS NULL
				GROUP BY d.id_oficio
			) AS t1"), 't1.id_oficio', '=', 'nuevos_oficios.id')

			/* folios: SOLO destinatarios no eliminados */
			->leftJoin(DB::raw("(
				SELECT 
					id_oficio,
					COUNT(*) AS total,
					STRING_AGG(CAST(folio AS VARCHAR(50)), ', ') AS folios,
					MAX(folio) AS folio
				FROM destinatarios_oficio
				WHERE deleted_at IS NULL
				GROUP BY id_oficio
			) AS folios"), 'folios.id_oficio', '=', 'nuevos_oficios.id')

			->when(auth()->user()->rol == 3, function ($q) {
				$q->where('nuevos_oficios.id_area', auth()->user()->id_area)
					->where('nuevos_oficios.revision', 1);
			})
			->when(auth()->user()->rol == 4, function ($q) {
				$q->where('nuevos_oficios.id_usuario', auth()->id());
			})
			->where('finalizado', 1)
			->orderBy('nuevos_oficios.created_at', 'desc')
			->get();

		// Normaliza/compacta solo si es lista; si ya es rango "a-b" sin comas, lo deja
		$nuevos = $nuevos->map(function ($item) {
			$val = trim((string)($item->oficio_respuesta ?? ''));

			if ($val === '') {
				return $item;
			}

			// Si ya es rango puro (contiene '-' y NO contiene coma), no tocar
			if (strpos($val, ',') === false && strpos($val, '-') !== false) {
				$item->oficio_respuesta = $val;
				return $item;
			}

			// Lista separada por comas -> filtra numéricos y ordena
			$folios = array_map('trim', explode(',', $val));
			$folios = array_values(array_filter($folios, fn($x) => ctype_digit($x)));

			if (count($folios) === 0) {
				$item->oficio_respuesta = $val; // deja el original
				return $item;
			}

			sort($folios, SORT_NUMERIC);

			if (count($folios) <= 5) {
				$item->oficio_respuesta = implode(', ', $folios);
				return $item;
			}

			// Compactar a rangos
			$rango = [];
			$inicio = $prev = null;
			foreach ($folios as $folioStr) {
				$folio = (int)$folioStr;
				if ($inicio === null) {
					$inicio = $prev = $folio;
					continue;
				}
				if ($folio === $prev + 1) {
					$prev = $folio;
					continue;
				}
				$rango[] = ($inicio === $prev) ? (string)$inicio : ($inicio . '-' . $prev);
				$inicio = $prev = $folio;
			}
			if ($inicio !== null) {
				$rango[] = ($inicio === $prev) ? (string)$inicio : ($inicio . '-' . $prev);
			}

			$item->oficio_respuesta = implode(', ', $rango);
			return $item;
		});
		return Inertia::render('Oficios/OficiosRespuestas', [
			'status'  => session('status'),
			'oficios' => $oficios,
			'nuevos'  => $nuevos
		]);
	}



	public function asignaResp(Request $request)
	{
		$request->validate([
			'proceso_impacta' => 'required',
			'usuario' => 'required',
		]);

		$oficio = Oficio::find($request->id);

		if ($oficio->proceso_impacta != $request->proceso_impacta) {
			$valor = "Aqui pondre el codigo para la bitacora";
		}

		$oficio->proceso_impacta = $request->proceso_impacta;
		$oficio->id_usuario = $request->usuario;
		$oficio->descripcion_rechazo = null;
		$oficio->save();

		$usuario = infoUsuario($request->usuario);

		iBitacoraOficio($request->id, 'Asignación de responsable', 'Se le asigno el oficio al colaborador: ' . $usuario->name, 'ion-man', 'primary');


		$folio = $oficio->ingreso == 'Email' ? $oficio->num_folio : $oficio->num_oficio;
		Mail::to($usuario->email)->later(now()->addSeconds(1), new Nuevo($usuario->name, $folio, $oficio->archivo));


		return back()->with('status', "Se asigno un responsable de forma correcta.");
	}


	public function respOficio($id)
	{
		$oficio = Oficio::find($id);

		$jefe = User::where('rol', 3)->where('id_area', $oficio->area)->first();
		$folio = $oficio->ingreso == 'Email' ? $oficio->num_folio : $oficio->num_oficio;

		if (\Auth::user()->rol == 3) {
			$oficio->finalizado = 1;
			$oficio->id_usuario = null;
			$asis = User::where('rol', 5)->first();
			IBitacoraOficio($id, 'Respuesta Jefe área', 'El jefe de área ' . $jefe->name . ' dio respuesta al oficio: ' . $oficio->num_oficio, 'fa fa-vcard', 'success');
			Mail::to($asis->email)->later(now()->addSeconds(2), new MailRespuestaOficio($asis->name, $folio, $id));
		} else if (\Auth::user()->rol == 4) {
			$usuario = infoUsuario($oficio->id_usuario);
			IBitacoraOficio($id, 'Respuesta Colaborador', 'El colaborador ' . $usuario->name . ' ha dado respuesta al oficio: ' . $oficio->num_oficio, 'fa fa-vcard', 'warning');
			Mail::to($jefe->email)->later(now()->addSeconds(2), new ColaboradorRespuesta($jefe->name, $usuario->name, $folio, $id));
		} else if (\Auth::user()->rol == 5) {
			$oficio->finalizado = 1;
			$oficio->enviado = 1;
			$oficio->fecha_respuesta = date('Y-m-d H:i:s');
			IBitacoraOficio($id, 'Respuesta enviada', 'Se ha enviado la respuesta del oficio', 'fa fa-send-o', 'primary');

			$usuario = infoUsuario($oficio->id_usuario);

			$mail = Mail::to($jefe->email);
			if (!empty($usuario)) {
				$mail->cc($usuario->email);
			}
			$mail->later(now()->addSeconds(2), new Enviado($folio));
		}
		$oficio->respuesta = 1;
		$oficio->descripcion_rechazo = null;
		$oficio->descripcion_rechazo_jefe = null;
		$oficio->descripcion_rechazo_final = null;
		$oficio->save();

		return to_route('misOficios');
	}

	public function rechazaOFicio(Request $request)
	{
		$request->validate([
			'descripcion' => 'required|min:2|max:500',
			'id'          => 'required|integer'
		]);

		$oficio = Oficio::find($request->id);
		if (!$oficio) {
			return back()->withErrors(['error' => 'No se encontró el oficio.']);
		}

		// 🔒 No permitir rechazar si es informativo
		if ((int)($oficio->informativo ?? 0) === 1) {
			return back()->withErrors([
				'error' => 'Este oficio es informativo; no aplica rechazar la responsabilidad.'
			]);
		}

		// Guarda nombre del responsable ANTES de limpiar el campo (podría estar NULL)
		$responsable = null;
		$responsableName = '';
		if (!empty($oficio->id_usuario)) {
			$responsable = User::find($oficio->id_usuario);
			$responsableName = $responsable?->name ?? '';
		}

		// Actualiza oficio
		$oficio->descripcion_rechazo = $request->descripcion;
		$oficio->id_usuario = null; // libera la asignación
		$oficio->save();

		// Bitácora
		iBitacoraOficio(
			$oficio->id,
			'Rechazo de oficio',
			'Justificación: ' . $request->descripcion,
			'fa fa-user-times',
			'danger'
		);

		// Notificar a Jefe de Área (rol=3) si existe
		$jefe = User::where('rol', 3)->where('id_area', $oficio->area)->first();

		$folio = $oficio->ingreso === 'Email' ? $oficio->num_folio : $oficio->num_oficio;

		if ($jefe) {
			// Pasa cadena segura para el nombre del responsable (puede ser vacía si no había)
			Mail::to($jefe->email)->later(
				now()->addSeconds(1),
				new Rechazo($jefe->name, $folio, $responsableName, $oficio->descripcion_rechazo)
			);
		} else {
			// Opcional: si no hay jefe configurado, podrías avisar a alguien más o registrar en bitácora
			iBitacoraOficio(
				$oficio->id,
				'Aviso',
				'No se encontró jefe de área (rol=3) para el área ' . $oficio->area . ' al notificar rechazo.',
				'fa fa-info-circle',
				'warning'
			);
		}

		return back()->with('status', "Se rechazó el oficio.");
	}


	public function aceptResp(int $id)
	{
		$oficio = Oficio::find($id);
		if (!$oficio) {
			Log::warning('aceptResp: Oficio no encontrado', ['id' => $id]);
			return back()->with('error', 'El oficio no existe.');
		}

		// Folio legible
		$folio = $oficio->ingreso === 'Email'
			? ($oficio->num_folio ?: "OFICIO-$id")
			: ($oficio->num_oficio ?: "OFICIO-$id");

		// Posibles actores
		$asis = User::where('rol', 5)->first(); // Asistente (opcional)
		$usuario = $oficio->id_usuario ? infoUsuario($oficio->id_usuario) : null; // Puede venir NULL

		try {
			if (Auth::user()?->rol == 5) {
				// Rama: asistente envía respuesta al jefe de área
				$jefe = User::where('rol', 3)->where('id_area', $oficio->area)->first();

				$oficio->enviado         = 1;
				$oficio->fecha_respuesta = now();

				// Bitácora
				iBitacoraOficio(
					$id,
					'Respuesta enviada',
					'Se ha enviado la respuesta del oficio',
					'fa fa-send-o',
					'primary'
				);

				// Generar y guardar PDF final (usa request() porque tu exportapdf lo pide)
				try {
					$rutaPDF = $this->exportapdf(request(), $id, 1);
					$oficio->oficio_final = $rutaPDF;
				} catch (\Throwable $e) {
					Log::error('aceptResp: Error generando PDF final', ['id' => $id, 'e' => $e->getMessage()]);
					// No abortamos el flujo; sólo seguimos sin adjuntar ruta.
				}

				// Envío de correo: sólo si hay destinatario
				if ($jefe?->email) {
					$mail = Mail::to($jefe->email);
					if (!empty($usuario?->email)) {
						$mail->cc($usuario->email);
					}
					// Usa later si tu cola está configurada; si no, puedes usar send()
					$mail->later(now()->addSeconds(2), new Enviado($folio));
				} else {
					Log::warning('aceptResp: No hay jefe de área para enviar correo', [
						'oficio_id' => $id,
						'area'      => $oficio->area,
					]);
				}
			} else {
				// Rama: jefe autoriza la respuesta del colaborador
				$oficio->finalizado = 1;

				iBitacoraOficio(
					$id,
					'Se autorizó la respuesta',
					'El jefe de área autorizó la respuesta del colaborador',
					'fa fa-thumbs-o-up',
					'success'
				);

				// Notificar a colaborador (si existe)
				if (!empty($usuario?->email)) {
					Mail::to($usuario->email)
						->later(now()->addSeconds(1), new AceptaRespuestaJefe($usuario->name ?? 'Usuario', $folio));
				} else {
					Log::warning('aceptResp: Oficio sin usuario asignado para notificar', ['oficio_id' => $id]);
				}

				// Notificar a asistente (si existe)
				if (!empty($asis?->email)) {
					Mail::to($asis->email)
						->later(now()->addSeconds(2), new MailRespuestaOficio($asis->name ?? 'Asistente', $folio, $id));
				} else {
					Log::warning('aceptResp: No hay asistente (rol=5) para notificar', ['oficio_id' => $id]);
				}
			}

			$oficio->save();
		} catch (\Throwable $e) {
			Log::error('aceptResp: Error general', ['oficio_id' => $id, 'e' => $e->getMessage()]);
			return back()->with('error', 'No fue posible procesar la acción. Revisa el log.');
		}

		// Redirección por rol
		return (Auth::user()?->rol == 3)
			? to_route('misOficios')
			: to_route('oficiosRespuestas');
	}
	/*
		Maneja el rechazo de una respuesta para un "Oficio".
		
		Valida la solicitud entrante para asegurar que el campo 'descripcion' esté presente y dentro de la longitud requerida.
		Busca el Oficio especificado por su ID, actualiza la descripción de rechazo, limpia cualquier descripción de respuesta previa
		y el archivo adjunto de respuesta, luego guarda los cambios.
		Finalmente, redirige al usuario a la ruta 'misOficios'.
		
		@param  \Illuminate\Http\Request  $request  La solicitud HTTP que contiene el ID del Oficio y la descripción del rechazo.
		@return \Illuminate\Http\RedirectResponse   Redirige a la ruta 'misOficios' después de procesar.
	*/
	public function rechazarResp(Request $request)
	{
		$request->validate([
			'descripcion' => 'required|min:2|max:500',
		]);

		$oficio = Oficio::find($request->id);
		$folio = $oficio->ingreso == 'Email' ? $oficio->num_folio : $oficio->num_oficio;
		$usuario = infoUsuario($oficio->id_usuario);

		if (\Auth::user()->rol == 3) {
			$oficio->descripcion_rechazo_jefe = $request->descripcion;
			iBitacoraOficio($request->id, 'Rechazo del jefe de área', 'Justificación: ' . $request->descripcion, 'fa fa-thumbs-o-down', 'danger');
			Mail::to($usuario->email)->later(now()->addSeconds(1), new RechazoRespuestaJefe($folio, $request->descripcion, $usuario->name, $request->id));
		} else {
			$oficio->descripcion_rechazo_final = $request->descripcion;
			$oficio->descripcion_rechazo_jefe = null;
			$oficio->finalizado = null;

			iBitacoraOficio($request->id, 'Rechazo de respuesta', 'Por parte de recepción documental con la siguiente justificación: ' . $request->descripcion, 'fa fa-thumbs-o-down', 'danger');

			$jefe = User::where('rol', 3)->where('id_area', $oficio->area)->first();
			Mail::to($jefe->email)->later(now()->addSeconds(1), new RechazoRespuestaFinal($jefe->name, $folio, $request->descripcion, $request->id, 'jefe', $oficio->id_usuario));

			if (!empty($usuario)) {
				Mail::to($usuario->email)->later(now()->addSeconds(3), new RechazoRespuestaFinal($usuario->name, $folio, $request->descripcion, $request->id, 'colaborador', $oficio->id_usuario));
			}
		}

		$oficio->respuesta = 0;
		$oficio->save();

		if (\Auth::user()->rol == 3) {
			return to_route('misOficios');
		} else {
			return to_route('oficiosRespuestas');
		}
	}
	public function marcarInformativo(Request $request, int $id)
	{
		$data = $request->validate([
			'requiere_atencion' => 'required|boolean',
		]);

		$oficio = Oficio::findOrFail($id);
		$oficio->informativo = 1;
		$oficio->requiere_atencion = $data['requiere_atencion'] ? 1 : 0;
		$oficio->save();

		// Opcional: puedes devolver props parciales si usas Inertia partial reloads,
		// pero con preserveState en front no es necesario.
		return back()->with('status', 'Oficio marcado como informativo');
	}


	public function saveCopias(Request $request)
	{
		$request->validate([
			'destinatario' => 'required',
			'dirigido_a' => 'required_if:destinatario,Interno',
		]);

		$copia = new Copia();
		if ($request->destinatario == 'Interno') {
			$direc = Directorio::find(intval($request->dirigido_a));
		} else {
			$direc = DestinatarioExterno::find(intval($request->dirigido_a));
		}

		if ($request->tipo == 1) {
			$copia->id_oficio = $request->id;
		} else {
			$copia->id_nuevo_oficio = $request->id;
		}
		$copia->nombre = $direc->nombre;
		$copia->cargo = $direc->cargo;
		$copia->dependencia = $direc->dependencia;
		$copia->id_directorio = $request->dirigido_a;
		$copia->save();

		$copy = Copia::select('id', 'id_oficio', 'nombre', 'cargo', 'dependencia')->where('id_oficio', $request->id)->get();

		return back()->with('copy', $copy);
	}

	public function deleteCopias($id)
	{
		$copia = Copia::find($id);
		if ($copia) {
			$copia->delete();
			return back()->with('status', "Se elimino la copia del oficio.");
		} else {
			return back()->with('error', "No se encontro la copia del oficio.");
		}
	}

	public function saveResp(Request $request)
	{
		$request->validate([
			'destinatarioDos' => 'required',
			'dirigido_aDos' => 'required_if:destinatarioDos,Interno',
			'nombreDos' => 'required|min:2|max:155',
			'cargoDos' => 'nullable|min:2|max:255',
			'dependenciaDos' => 'nullable|min:2|max:255',
			'asunto' => 'nullable|min:2',
			'comentario' => 'nullable|min:2|max:1000'
		]);


		$bandera = RespuestaOficio::where('id_oficio', $request->id_oficio)->first();
		if (empty($bandera)) {
			$respuesta = new RespuestaOficio();

			$ultimo = Variables::where('variable', 'Oficio')->first();
			$oficio = ($ultimo->valor + 1);
			Variables::where('variable', 'Oficio')->update(['valor' => $oficio]);

			$respuesta->id_oficio = $request->id_oficio;
			$respuesta->oficio_respuesta = $oficio;
		} else {
			$respuesta = RespuestaOficio::find($bandera->id);
		}

		$respuesta->id_directorio = $request->dirigido_aDos;
		$respuesta->tipo_destinatario = $request->destinatarioDos;
		$respuesta->nombre = $request->nombreDos;
		$respuesta->cargo = $request->cargoDos;
		$respuesta->dependencia = $request->dependenciaDos;
		$respuesta->respuesta = $request->asunto;
		$respuesta->comentario = $request->comentario;
		$respuesta->save();

		return back()->with('status', "Se guardo la respuesta del oficio.");
	}

	public function detailResp($id)
	{
		try {
			$copy = Copia::select('id', 'id_oficio', 'id_directorio', 'nombre', 'cargo', 'dependencia')->where('id_oficio', $id)->get();

			$respuesta = RespuestaOficio::select('id_oficio', 'tipo_destinatario as destinatarioDos', 'nombre as nombreDos', 'cargo as cargoDos', 'dependencia as dependenciaDos', 'id_directorio as dirigido_aDos', 'respuesta as asunto')
				->where('id_oficio', $id)
				->first();

			$msg = [
				'code' => 200,
				'mensaje' => 'Detalle de la respuesta',
				'copy' => $copy,
				'respuesta' => $respuesta
			];
		} catch (\Illuminate\DataBase\QueryException $ex) {
			$msg = [
				'code' => 400,
				'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
				'data' => $ex
			];
		} catch (Exception $e) {
			$msg = [
				'code' => 400,
				'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
				'data' => $e
			];
		}

		return response()->json($msg, $msg['code']);
	}

	/**
	 * Exporta un oficio en formato PDF.
	 *
	 * Esta función genera un archivo PDF a partir de la información de un oficio, incluyendo la respuesta,
	 * las copias y los datos del área y proceso relacionados. La fecha actual se formatea en español.
	 *
	 * @param int $opcion Indica si el PDF se descarga (mayor a 0) o se muestra en el navegador (0 o menor).
	 * @param int $id ID del oficio a exportar.
	 * @return \Illuminate\Http\Response Respuesta HTTP con el PDF generado para visualización.
	 */
	public function exportapdf(Request $request, int $id, int $guarda = 0)
	{
		// 1) Datos base
		$respuesta = RespuestaOficio::where('id_oficio', $id)->first();
		$of        = Oficio::find($id);

		$fecha = $respuesta?->fecha_respuesta ?: date('Y-m-d');
		setlocale(LC_TIME, 'es_ES.UTF-8', 'Spanish_Spain.1252');
		$fechaEscrita = strftime('%d de %B de %Y', strtotime($fecha));
		if (strpos($fechaEscrita, '%') !== false) {
			$meses = [1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril', 5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto', 9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre'];
			$fechaEscrita = date('d', strtotime($fecha)) . ' de ' . $meses[(int)date('m', strtotime($fecha))] . ' de ' . date('Y', strtotime($fecha));
		}

		$copias = Copia::where('id_oficio', $id)->get();

		$ofInfo = Oficio::select(
			'users.iniciales as area',
			'u.iniciales as proceso',
			'cat_areas.siglas'
		)
			->leftJoin('users', fn($j) => $j->on('users.rol', '=', DB::raw("3"))->on('users.id_area', '=', 'oficios.area'))
			->leftJoin('users as u', fn($j) => $j->on('u.rol',   '=', DB::raw("4"))->on('u.id',        '=', 'oficios.id_usuario'))
			->join('cat_areas', 'cat_areas.id', 'oficios.area')
			->where('oficios.id', $id)
			->first();

		$tipoUsuario = match ($respuesta?->tipo_destinatario) {
			'Externo' => 2,
			'Interno' => 1,
			default   => 1,
		};

		// 🔑 Usuario "dueño" para separar cachés por actor
		$idUsuario = (int) ($of?->id_usuario ?? Auth::id() ?? 0);

		// 2) HTML del editor → apto para Dompdf + URLs absolutas
		$respRaw      = (string)($respuesta->respuesta ?? '');
		$contenidoPdf = PdfHtml::pdfifySunEditorHtml($respRaw);
		$contenidoPdf = PdfHtml::absolutizePublicStorage($contenidoPdf);

		// 3) Clave de caché robusta
		$versionPlantilla = 'v2'; // súbela si cambias la Blade
		$respHash   = sha1($respRaw);
		$htmlHash   = sha1($contenidoPdf);
		$copiasHash = sha1($copias->map(fn($c) => [
			'n' => $c->nombre,
			'c' => $c->cargo,
			'd' => $c->dependencia,
			'u' => optional($c->updated_at)->timestamp,
		])->toJson());

		$stamp = implode('|', [
			$versionPlantilla,
			"id:$id",
			"tipo:$tipoUsuario",
			"usr:$idUsuario",
			'of_up:'   . optional($of?->updated_at)->timestamp,
			'resp_up:' . optional($respuesta?->updated_at)->timestamp,
			'resp_hash:' . $respHash,
			'html_hash:' . $htmlHash,
			'copias:'    . $copiasHash,
			'fecha:'     . $fechaEscrita,
			'area:' . ($ofInfo->area ?? ''),
			'proc:' . ($ofInfo->proceso ?? ''),
			'sig:'  . ($ofInfo->siglas ?? ''),
		]);

		$key   = sha1($stamp);
		$etag  = '"' . $key . '"';


		$rel   = "pdf_cache/oficio_{$id}_{$tipoUsuario}_{$idUsuario}_{$key}.pdf";
		$disk  = Storage::disk('local');
		$disk->makeDirectory('pdf_cache');
		$abs   = $disk->path($rel);

		// 4) Bypass de caché vía query (vista previa o impresión)
		$skipCache = ($request->query('nocache') === '1') || $request->has('_print_ts');

		// 5) Servir desde caché si existe y no piden bypass
		if (!$skipCache && $disk->exists($rel) && is_file($abs)) {
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

			$bytes = file_get_contents($abs);
			if ($guarda === 1) {
				$dest = 'pdfs_oficios/oficio_' . $id . '_' . now()->format('YmdHis') . '.pdf';
				Storage::disk('files')->put($dest, $bytes);
				return $dest;
			}

			return response($bytes, 200, [
				'Content-Type'        => 'application/pdf',
				'Content-Disposition' => 'inline; filename="respuesta_oficio.pdf"',
				'Cache-Control'       => 'public, max-age=86400',
				'ETag'                => $etag,
				'Last-Modified'       => $lastMod,
			]);
		}

		// 6) Generar el PDF (imágenes remotas habilitadas)
		$pdf = Pdf::setOptions([
			'dpi'                    => 96,
			'enable_font_subsetting' => true,
			'isHtml5ParserEnabled'   => true,
			'isRemoteEnabled'        => false,
			'fontDir'   => storage_path('fonts'),
			'fontCache' => storage_path('fonts'),
			'tempDir'   => storage_path('app/dompdf_temp'),
			'chroot'    => base_path(),
		])->loadView('Oficios.Vice', [
			'respuesta'     => $respuesta,
			'copias'        => $copias,
			'oficio'        => $ofInfo,
			'fechaEscrita'  => $fechaEscrita,
			'tipo_usuario'  => $tipoUsuario,
			'contenidoPdf'  => $contenidoPdf,
		])->setPaper('letter', 'portrait');

		$bytes = $pdf->output();

		// 7) Guardar en caché local
		$disk->put($rel, $bytes);

		// 💡 Poda versiones antiguas del mismo oficio/destinatario/usuario
		\App\Support\PdfCache::pruneSiblings(
			(int) $id,
			(int) $tipoUsuario,
			(int) $idUsuario
		);

		clearstatcache(true, $abs);
		$mtime   = @filemtime($abs) ?: time();
		$lastMod = gmdate('D, d M Y H:i:s', $mtime) . ' GMT';

		if ($guarda === 1) {
			$dest = 'pdfs_oficios/oficio_' . $id . '_' . now()->format('YmdHis') . '.pdf';
			Storage::disk('files')->put($dest, $bytes);
			return $dest;
		}

		return response($bytes, 200, [
			'Content-Type'        => 'application/pdf',
			'Content-Disposition' => 'inline; filename="respuesta_oficio.pdf"',
			'Cache-Control'       => 'public, max-age=86400',
			'ETag'                => $etag,
			'Last-Modified'       => $lastMod,
		]);
	}

	public function uploadFiles(Request $request, $id)
	{
		@ini_set('upload_max_filesize', '30M');
		@ini_set('post_max_size', '30M');

		if (!$request->expectsJson()) {
			$request->headers->set('Accept', 'application/json');
		}

		$request->validate([
			'file' => 'required|file|max:25600|mimes:pdf,doc,docx,jpg,jpeg,png,xlsx,xls,csv,txt,pptx,xml,zip,rar',
		]);

		if (!$request->hasFile('file')) {
			return response()->json(['error' => 'No se subió ningún archivo'], 400);
		}

		$file = $request->file('file');

		$ext  = strtolower($file->getClientOriginalExtension() ?: '');
		$orig = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

		// patrón que ya usabas + limpieza total
		$base = time() . '_' . (auth()->id() ?? 0) . '_' . $orig;
		$base = FS::cleanBase($base);

		$dir  = 'adjuntos_oficios';
		$disk = 'files';
		$path = FS::avoidCollision($disk, $dir . '/' . $base . ($ext ? '.' . $ext : ''));

		// guarda con el nombre final
		Storage::disk($disk)->putFileAs($dir, $file, basename($path));

		// registra en BD con rutas/nom. limpios
		$archivoOficio = new ArchivoOficio();
		$archivoOficio->id_oficio = $id;
		$archivoOficio->archivo   = $path;
		$archivoOficio->nombre    = FS::cleanBase($orig) . ($ext ? '.' . $ext : '');
		$archivoOficio->save();

		return response()->json([
			'id'   => $archivoOficio->id,
			'path' => $path,
			'url'  => Storage::url($path),
		]);
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

	public function downloadFiles($id)
	{
		$archivos = ArchivoOficio::where('id_oficio', $id)->get();

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

	public function subeEvidenciaRecibido(Request $request)
	{
		@ini_set('upload_max_filesize', '30M');
		@ini_set('post_max_size', '30M');

		$request->validate([
			'archivo' => 'required|file|max:25600|mimes:pdf,jpg,png,jpeg',
			'tipo'    => 'required|in:respuesta,nuevo,destinatario',
			'id'      => 'required|integer',
		]);

		$file = $request->file('archivo');

		$ext  = strtolower($file->getClientOriginalExtension() ?: '');
		$orig = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

		$base = time() . '_' . (auth()->id() ?? 0) . '_' . $orig;
		$base = FS::cleanBase($base);

		$dir  = 'recibido_oficios';
		$disk = 'files';
		$path = FS::avoidCollision($disk, $dir . '/' . $base . ($ext ? '.' . $ext : ''));

		Storage::disk($disk)->putFileAs($dir, $file, basename($path));

		// setea en el modelo correcto
		if ($request->tipo === 'respuesta') {
			$oficio = Oficio::findOrFail($request->id);
		} elseif ($request->tipo === 'nuevo') {
			$oficio = NuevoOficio::findOrFail($request->id);
		} else { // destinatario
			$oficio = DestinatarioOficio::findOrFail($request->id);
		}

		// guarda ruta limpia (si añadiste mutator aún más seguro)
		$oficio->archivo_respuesta = $path;
		$oficio->save();

		if ($request->tipo === 'destinatario') {
			$bandera = DestinatarioOficio::select(
				'id_oficio',
				DB::raw("SUM(CASE WHEN archivo_respuesta IS NULL OR LTRIM(RTRIM(archivo_respuesta)) = '' THEN 1 ELSE 0 END) as pendientes")
			)
				->where('id_oficio', $oficio->id_oficio)
				->groupBy('id_oficio')
				->first();

			if ($bandera && (int)$bandera->pendientes === 0) {
				$nuevo = NuevoOficio::find($oficio->id_oficio);
				if ($nuevo) {
					$nuevo->archivo_respuesta = "TERMINADO";
					$nuevo->save();
				}
				return redirect()->route('oficiosRespuestas');
			}
		}

		return back()->with('status', "Se guardó la respuesta del oficio.");
	}

	public function actualizaFecha(Request $request)
	{
		$request->validate([
			'fecha' => 'required|date',
		]);

		$oficio = RespuestaOficio::find($request->id);
		$oficio->fecha_respuesta = $request->fecha;
		$oficio->save();

		return back()->with('status', "Se actualizo la fecha de respuesta del oficio.");
	}

	public function getArchivosAdjuntos($id, $tipo)
	{
		try {
			// Whitelist por seguridad
			$col = in_array($tipo, ['id_oficio', 'id_oficio_inicial', 'id_nuevo_oficio'], true)
				? $tipo
				: 'id_oficio';

			$archivos = ArchivoOficio::select('id', 'nombre', 'archivo')
				->where($col, $id)
				->get()
				->map(fn($archivo) => $this->makeFilePayload($archivo))
				->values(); // reindexa [0..n]

			return response()->json([
				'code'    => 200,
				'mensaje' => 'Listado de archivos adjuntos al oficio',
				'data'    => $archivos,
			], 200);
		} catch (\Illuminate\Database\QueryException $ex) {
			return response()->json([
				'code' => 400,
				'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
				'data' => $ex->getMessage(),
			], 400);
		} catch (\Exception $e) {
			return response()->json([
				'code' => 400,
				'mensaje' => 'Intente de nuevo o consulte al administrador del sistema',
				'data' => $e->getMessage(),
			], 400);
		}
	}

	public function getEstatus($valor, $tipo)
	{
		try {
			$where = "";
			if (\Auth::user()->rol == 3)       $where  = " AND oficios.area = " . \Auth::user()->id_area;
			else if (\Auth::user()->rol == 4)  $where  = " AND oficios.id_usuario = " . \Auth::user()->id;
			else if (\Auth::user()->rol == 5)  $where  = " AND oficios.finalizado = 1";

			// === subconsultas idénticas a index() ===
			$ultResp = DB::table('respuestas_oficio as r')->select([
				'r.id_oficio',
				'r.respuesta',
				'r.nombre',
				DB::raw('r.oficio_respuesta as oficio_respuesta_all'),
				DB::raw('ROW_NUMBER() OVER (PARTITION BY r.id_oficio ORDER BY r.fecha_respuesta DESC, r.id DESC) AS rn'),
				DB::raw("CONVERT(VARCHAR(19), r.fecha_respuesta, 120) as f_respuesta_raw2"),
			]);

			$ultRespFolio = DB::table('respuestas_oficio as r')
				->whereNotNull('r.oficio_respuesta')
				->whereRaw("LTRIM(RTRIM(CAST(r.oficio_respuesta AS VARCHAR(100)))) <> ''")
				->select([
					'r.id_oficio',
					'r.oficio_respuesta',
					DB::raw('ROW_NUMBER() OVER (PARTITION BY r.id_oficio ORDER BY r.fecha_respuesta DESC, r.id DESC) AS rn'),
				]);

			$oficios = Oficio::select(
				DB::raw("CONVERT(VARCHAR(19), oficios.created_at, 120) as f_ingreso_raw"),
				DB::raw("CONVERT(VARCHAR(19), oficios.fecha_respuesta, 120) as f_respuesta_raw"),
				DB::raw("COALESCE(cat_procesos.minutos_oficio, cat_areas.minutos_oficio, 4320) as sla_min"),

				DB::raw("CONCAT(
                RIGHT('0'+cast(DAY(oficios.created_at) as varchar(2)),2),
                ' de ', dbo.fn_GetMonthName (oficios.created_at, 'Spanish'),
                ' de ', YEAR(oficios.created_at), ' ',
                CONVERT(VARCHAR(5), oficios.created_at,108)
            ) as f_ingreso"),

				'oficios.id',
				'num_folio',
				'num_oficio',
				DB::raw("CASE WHEN ingreso = 'Email' THEN num_folio ELSE num_oficio END as numero_oficio"),
				'cat_des.nombre as des',
				'cat_areas.nombre as area',
				'cat_procesos.nombre as proceso',
				'dep_ua',
				'oficios.area as id_area',

				// === Fallback al jefe de área, igual que en index() ===
				DB::raw("
                CASE 
                    WHEN (oficios.id_usuario IS NULL OR oficios.id_usuario = 0)
                    THEN (
                        SELECT TOP 1 u.name
                        FROM users u
                        WHERE u.rol = 3 AND u.id_area = oficios.area
                        ORDER BY u.id ASC
                    )
                    ELSE ISNULL(users.name, '')
                END as responsable
            "),

				'oficios.id_usuario',
				'proceso_impacta',
				'descripcion',
				'oficios.archivo',
				'oficios.descripcion_respuesta',
				'oficios.archivo_respuesta',
				'oficios.descripcion_rechazo',
				'oficios.finalizado',
				'oficios.respuesta',
				'oficios.oficio_final',
				'oficios.descripcion_rechazo_jefe',
				'descripcion_rechazo_final',
				DB::raw("RIGHT(oficios.archivo_respuesta, 3) as extension"),

				// === folio/destinatario/asunto, igual que index() ===
				DB::raw("COALESCE(rof.oficio_respuesta, ro.oficio_respuesta_all, '') as folio_respuesta"),
				DB::raw("COALESCE(ro.nombre,'') as destinatario"),
				DB::raw("COALESCE(ro.respuesta,'') as asunto"),
				DB::raw("ro.f_respuesta_raw2")
			)
				->join('cat_des', 'cat_des.id', 'oficios.dep_ua')
				->join('cat_areas', 'cat_areas.id', 'oficios.area')
				->leftJoin('cat_procesos', 'cat_procesos.id', 'oficios.proceso_impacta')
				->leftJoin('users', 'users.id', 'oficios.id_usuario')
				->leftJoinSub($ultResp, 'ro', fn($j) => $j->on('ro.id_oficio', '=', 'oficios.id')->where('ro.rn', 1))
				->leftJoinSub($ultRespFolio, 'rof', fn($j) => $j->on('rof.id_oficio', '=', 'oficios.id')->where('rof.rn', 1))
				->where(function ($q) use ($where) {
					$q->whereRaw("1=1 $where")
						->orWhere('oficios.area', 1);
				})
				->orderByDesc('oficios.created_at')
				->get();

			// semáforo (prioriza fecha de ro si existe)
			$oficios = $oficios->map(function ($o) {
				$fechaResp = $o->f_respuesta_raw2 ?? $o->f_respuesta_raw ?? null;
				[$estatus, $color, $vence] = $this->semaforoOficio($o->f_ingreso_raw, $fechaResp, (int)($o->sla_min ?? 4320));
				$o->estatus_valor = $estatus;
				$o->color = $color;
				$o->vence_real = $vence->format('Y-m-d H:i:s');
				return $o;
			});

			if (in_array((int)$valor, [1, 2, 3, 4], true)) {
				$oficios = $oficios->filter(fn($o) => (int)$o->estatus_valor === (int)$valor)->values();
			}

			return response()->json(['code' => 200, 'mensaje' => 'OK', 'data' => $oficios], 200);
		} catch (\Throwable $e) {
			return response()->json(['code' => 400, 'mensaje' => 'Error', 'data' => $e->getMessage()], 400);
		}
	}
}
