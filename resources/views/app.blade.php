<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#4f46e5">
    <link rel="icon" type="image/svg+xml" href="/vite.svg">
    <link rel="manifest" href="/manifest.json">

    <title inertia>{{ config('app.name', 'CRM') }}</title>

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @inertiaHead
</head>
<body class="h-full">
    @inertia
</body>
</html>
