<?php

use App\Http\Controllers\PatrolController as P;
use App\Http\Controllers\SuperadminController as S;
use Illuminate\Support\Facades\Route;

Route::post('/login', [P::class, 'login'])->middleware('throttle:10,1');
Route::post('/sso', [P::class, 'sso'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [P::class, 'logout']);
    Route::get('/me', [P::class, 'me']);
    Route::get('/master', [P::class, 'master']);
    Route::get('/tasks', [P::class, 'tasks']);
    Route::get('/findings', [P::class, 'findings']);
    Route::post('/findings', [P::class, 'storeFinding']);
    Route::post('/resolutions', [P::class, 'storeResolution']);
    Route::get('/foto/{path}', [P::class, 'photo'])->where('path', '.*');

    Route::middleware('can:superadmin')->group(function () {
        Route::get('/users', [S::class, 'users']);
        Route::post('/users', [S::class, 'storeUser']);
        Route::patch('/users/{user}', [S::class, 'updateUser']);
        Route::delete('/users/{user}', [S::class, 'destroyUser']);
        Route::post('/master/{table}', [S::class, 'storeMaster'])->whereIn('table', ['areas', 'departments']);
        Route::patch('/master/{table}/{id}', [S::class, 'updateMaster'])->whereIn('table', ['areas', 'departments'])->whereNumber('id');
        Route::delete('/master/{table}/{id}', [S::class, 'destroyMaster'])->whereIn('table', ['areas', 'departments'])->whereNumber('id');
    });
});
