<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    /**
     * Panel girişi: 4 haneli şifre (PIN). Şifre hangi personele aitse o rolle giriş yapılır
     * (yönetici: tüm ekranlar, garson: masalar, mutfak ekranı, QR kodlar).
     */
    public function login(Request $request)
    {
        $request->validate([
            'pin' => ['required', 'string', 'regex:/^\d{4}$/'],
        ], [
            'pin.regex' => 'Şifre 4 haneli olmalıdır.',
        ]);

        $user = User::findByPin($request->input('pin'));

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Şifre hatalı.',
            ], 401);
        }

        // Giriş başarılıysa Sanctum ile bir erişim anahtarı (token) üret
        $token = $user->createToken('unopia-pos-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        // İsteği yapan kullanıcının o an kullandığı token'ı veritabanından sil
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Başarıyla çıkış yapıldı ve oturum kapatıldı.'
        ]);
    }

    /**
     * Yönetici: yönetici ve garson şifrelerini değiştirir. Boş bırakılan şifre değişmez.
     * Garson şifresi değişince garsonun açık oturumları kapanır (eski şifreyi bilen artık giremez).
     */
    public function updatePins(Request $request)
    {
        $data = $request->validate([
            'manager_pin' => ['nullable', 'string', 'regex:/^\d{4}$/'],
            'waiter_pin' => ['nullable', 'string', 'regex:/^\d{4}$/'],
        ], [
            'manager_pin.regex' => 'Yönetici şifresi 4 haneli rakam olmalıdır.',
            'waiter_pin.regex' => 'Garson şifresi 4 haneli rakam olmalıdır.',
        ]);

        $manager = $request->user();
        $waiter = User::where('role', 'garson')->orderBy('id')->first();
        $newManager = $data['manager_pin'] ?? null;
        $newWaiter = $data['waiter_pin'] ?? null;

        if ($newManager === null && $newWaiter === null) {
            return response()->json(['success' => false, 'message' => 'Değiştirilecek şifreyi girin.'], 422);
        }
        if ($newWaiter !== null && !$waiter) {
            return response()->json(['success' => false, 'message' => 'Garson hesabı bulunamadı.'], 422);
        }

        // Şifre kişiyi belirlediği için iki kişinin şifresi aynı olamaz.
        // Kontrol, değişiklikten sonraki son durum üzerinden yapılır.
        $changing = array_filter([$manager->id => $newManager, $waiter?->id => $newWaiter], fn ($p) => $p !== null);
        $clash = (count($changing) === 2 && $newManager === $newWaiter)
            || User::whereNotIn('id', array_keys($changing))
                ->whereIn('pin', array_map(fn ($p) => User::hashPin($p), array_values($changing)))
                ->exists();

        if ($clash) {
            return response()->json(['success' => false, 'message' => 'Yönetici ve garson şifreleri farklı olmalıdır.'], 422);
        }

        DB::transaction(function () use ($manager, $waiter, $newManager, $newWaiter, $changing) {
            // Şifreler yer değiştirebilir (yönetici ↔ garson): unique indeks takılmasın diye önce boşaltılır
            User::whereIn('id', array_keys($changing))->update(['pin' => null]);
            // Sorguyla yazılır: model eski şifreyi tuttuğu için aynı şifre girilirse yazmayı atlamasın
            if ($newManager !== null) {
                User::whereKey($manager->id)->update(['pin' => User::hashPin($newManager)]);
            }
            if ($newWaiter !== null) {
                User::whereKey($waiter->id)->update(['pin' => User::hashPin($newWaiter)]);
                $waiter->tokens()->delete();
            }
        });

        return response()->json(['success' => true, 'message' => 'Şifreler güncellendi.']);
    }
}
