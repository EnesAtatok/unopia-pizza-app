<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Kısa açıklama artık malzemelerle aynıdır (bkz. ProductController::validated).
     * Mevcut ürünler: malzeme doluysa açıklamaya kopyalanır; malzeme boşsa açıklamadaki liste malzemeye taşınır.
     * Çeviriler (en, bg, el) de aynı kuralla eşitlenir.
     */
    public function up(): void
    {
        foreach (DB::table('products')->get(['id', 'description', 'ingredients', 'translations']) as $p) {
            [$description, $ingredients] = self::sync($p->description, $p->ingredients);

            $translations = $p->translations ? json_decode($p->translations, true) : null;
            if (is_array($translations)) {
                foreach ($translations as $locale => $fields) {
                    [$d, $i] = self::sync($fields['description'] ?? null, $fields['ingredients'] ?? null);
                    unset($translations[$locale]['description'], $translations[$locale]['ingredients']);
                    if ($i !== null) {
                        $translations[$locale]['ingredients'] = $i;
                        $translations[$locale]['description'] = $d;
                    }
                }
            }

            DB::table('products')->where('id', $p->id)->update([
                'description' => $description,
                'ingredients' => $ingredients,
                'translations' => $translations ? json_encode($translations, JSON_UNESCAPED_UNICODE) : null,
            ]);
        }
    }

    public function down(): void
    {
        // Eski açıklamalar geri getirilemez (veri eşitlemesi)
    }

    /** @return array{0: ?string, 1: ?string} [açıklama, malzemeler] */
    private static function sync(?string $description, ?string $ingredients): array
    {
        $ingredients = trim((string) $ingredients) ?: trim((string) $description) ?: null;

        return [$ingredients === null ? null : mb_substr($ingredients, 0, 255), $ingredients];
    }
};
