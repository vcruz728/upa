<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void
    {
        Schema::create('descansos', function (Blueprint $table) {
            $table->id();
            $table->date('descanso_dia')
                ->unique();          // 2025-12-25
            $table->string('descripcion', 150);           // Navidad
            $table->timestamps();
            $table->index('descanso_dia');
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('descansos');
    }
};
