<?php

use Illuminate\Support\Facades\Route;

Route::redirect('/', '/app');

$serveApp = function () {
    $path = public_path('app/index.html');

    if (! file_exists($path)) {
        abort(404);
    }

    return response()->file($path);
};

Route::get('/app', $serveApp);
Route::get('/app/{path}', $serveApp);
Route::get('/app/{section}/{subsection}', $serveApp);

Route::fallback(function () {
    $requestPath = request()->path();

    if (! str_starts_with($requestPath, 'app')) {
        abort(404);
    }

    $path = public_path('app/index.html');

    if (! file_exists($path)) {
        abort(404);
    }

    return response()->file($path);
});
