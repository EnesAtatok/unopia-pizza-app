<?php

namespace App\Support;

/**
 * QR menü çevirileri (en, bg, el). Türkçe asıl alanlarda durur; burada yalnızca diğer diller.
 * Biçim: ['en' => ['name' => …, 'description' => …], 'bg' => [...], 'el' => [...]]
 */
class Translations
{
    public const LOCALES = ['en', 'bg', 'el'];

    /** @param array<string, int> $fields alan => en fazla karakter */
    public static function rules(array $fields): array
    {
        $rules = ['translations' => 'nullable|array'];
        foreach (self::LOCALES as $locale) {
            $rules["translations.$locale"] = 'nullable|array';
            foreach ($fields as $field => $max) {
                $rules["translations.$locale.$field"] = "nullable|string|max:$max";
            }
        }

        return $rules;
    }

    /** Boş alanları ve tanımsız dilleri atar; hiç çeviri yoksa null */
    public static function clean(?array $translations, array $fields): ?array
    {
        $out = [];
        foreach (self::LOCALES as $locale) {
            foreach (array_keys($fields) as $field) {
                $value = trim((string) ($translations[$locale][$field] ?? ''));
                if ($value !== '') {
                    $out[$locale][$field] = $value;
                }
            }
        }

        return $out ?: null;
    }
}
