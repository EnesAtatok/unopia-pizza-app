<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API hataları Türkçe ve sade döner; sunucu ayrıntısı (yığın izi, dosya yolu, SQL) gösterilmez
        $json = fn (string $message, int $status) => response()->json(['success' => false, 'message' => $message], $status);

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) use ($json) {
            if ($request->is('api/*')) {
                return $json(__('Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.'), 429);
            }
        });
        $exceptions->render(function (AuthenticationException $e, Request $request) use ($json) {
            if ($request->is('api/*')) {
                return $json('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.', 401);
            }
        });
        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) use ($json) {
            if ($request->is('api/*')) {
                return $json(__('Kayıt bulunamadı.'), 404);
            }
        });
        $exceptions->render(function (Throwable $e, Request $request) use ($json) {
            $handled = $e instanceof HttpExceptionInterface || $e instanceof ValidationException || $e instanceof AuthorizationException;
            if ($request->is('api/*') && !config('app.debug') && !$handled) {
                return $json(__('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'), 500);
            }
        });
    })->create();
