<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Request;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Respeta el esquema que te pasa Caddy
        if (request()->header('x-forwarded-proto')) {
            URL::forceScheme(request()->header('x-forwarded-proto'));
        }

        // Si tu app vive bajo /vd:
        if (config('app.url')) {
            URL::forceRootUrl(config('app.url')); // p.ej. http://localhost/vd
        }
    }
}
