<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Panel girişi 4 haneli şifre (PIN) ile: yönetici ve garson. Şifre HMAC olarak tutulur (User::hashPin).
        Schema::table('users', function (Blueprint $table) {
            $table->string('pin', 64)->nullable()->unique()->after('password');
        });

        // Başlangıç şifreleri: yönetici 9999, garson 1111 (yönetici panelden değiştirebilir)
        $manager = DB::table('users')->where('role', 'patron')->orderBy('id')->first();
        if ($manager) {
            DB::table('users')->where('id', $manager->id)->update(['pin' => User::hashPin('9999')]);
        }
        $waiter = DB::table('users')->where('role', 'garson')->orderBy('id')->first();
        if ($waiter) {
            DB::table('users')->where('id', $waiter->id)->update(['pin' => User::hashPin('1111')]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['pin']);
            $table->dropColumn('pin');
        });
    }
};
