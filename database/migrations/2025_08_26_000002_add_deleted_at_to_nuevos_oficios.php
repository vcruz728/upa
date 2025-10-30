<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('nuevos_oficios', function (Blueprint $table) {
            $table->softDeletes(); // crea columna deleted_at (datetime nullable)
        });
    }

    public function down(): void
    {
        Schema::table('nuevos_oficios', function (Blueprint $table) {
            $table->dropSoftDeletes(); // elimina deleted_at
        });
    }
};
