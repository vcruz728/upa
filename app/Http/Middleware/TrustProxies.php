<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies as Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Request as SymfonyRequest;


class TrustProxies extends Middleware
{
    /**
     * The trusted proxies for this application.
     *
     * @var array<int, string>|string|null
     */
    protected $proxies = '*';

    /**
     * The headers that should be used to detect proxies.
     *
     * @var int
     */
    // protected $headers =
    // Request::HEADER_X_FORWARDED_FOR |
    //     Request::HEADER_X_FORWARDED_HOST |
    //     Request::HEADER_X_FORWARDED_PORT |
    //     Request::HEADER_X_FORWARDED_PROTO |
    //     Request::HEADER_X_FORWARDED_AWS_ELB;

    protected $headers =
    Request::HEADER_X_FORWARDED_FOR |
        Request::HEADER_X_FORWARDED_HOST |
        Request::HEADER_X_FORWARDED_PORT |
        Request::HEADER_X_FORWARDED_PROTO;
    // Si usas ELB, puedes añadir:
    // | Request::HEADER_X_FORWARDED_AWS_ELB
}
