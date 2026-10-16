<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

/**
 * Basılı Unopia menüsündeki ürünler (pizzalar, gurme pizzalar, tatlılar, sıcak ve soğuk içecekler).
 * Tekrar çalıştırılabilir: adı zaten olan ürüne dokunulmaz (panelden girilen fiyat / fotoğraf korunur).
 *
 * php artisan db:seed --class=MenuImportSeeder
 */
class MenuImportSeeder extends Seeder
{
    /** Malzeme sözlüğü: tr => [en, bg, el] — malzeme listelerinin çevirisi bundan kurulur */
    private const TERMS = [
        'Pizza sosu' => ['Pizza sauce', 'Сос за пица', 'Σάλτσα πίτσας'],
        'mozzarella' => ['mozzarella', 'моцарела', 'μοτσαρέλα'],
        'Mozzarella' => ['Mozzarella', 'Моцарела', 'Μοτσαρέλα'],
        'Mozzarella peyniri' => ['Mozzarella cheese', 'Сирене моцарела', 'Τυρί μοτσαρέλα'],
        'pizza sosu' => ['pizza sauce', 'сос за пица', 'σάλτσα πίτσας'],
        'jambon' => ['ham', 'шунка', 'ζαμπόν'],
        'kapya biber' => ['red pepper', 'червена чушка', 'κόκκινη πιπεριά'],
        'zeytin' => ['olives', 'маслини', 'ελιές'],
        'mısır' => ['corn', 'царевица', 'καλαμπόκι'],
        'sucuk' => ['sucuk (spicy beef sausage)', 'суджук', 'σουτζούκι'],
        'köz patlıcan' => ['roasted eggplant', 'печен патладжан', 'ψητή μελιτζάνα'],
        'köz kapya biber' => ['roasted red pepper', 'печена червена чушка', 'ψητή κόκκινη πιπεριά'],
        'roka' => ['rocket', 'рукола', 'ρόκα'],
        'baharat' => ['spices', 'подправки', 'μπαχαρικά'],
        'sarımsaklı zeytinyağı' => ['garlic olive oil', 'зехтин с чесън', 'σκορδελαιόλαδο'],
        'kavurma' => ['kavurma (braised beef)', 'кавърма', 'καβουρμάς'],
        'soğan' => ['onion', 'лук', 'κρεμμύδι'],
        'mantar' => ['mushrooms', 'гъби', 'μανιτάρια'],
        'jalapeno biber' => ['jalapeño', 'халапеньо', 'χαλαπένιο'],
        'küp sucuk' => ['diced sucuk', 'суджук на кубчета', 'σουτζούκι σε κύβους'],
        'pastırma' => ['pastırma (cured beef)', 'пастърма', 'παστουρμάς'],
        'cherry domates' => ['cherry tomatoes', 'чери домати', 'ντοματίνια'],
        'karaağaç biberi' => ['Karaağaç pepper', 'чушка Караагач', 'πιπεριά Καραάγατς'],
        'biber' => ['peppers', 'чушки', 'πιπεριές'],
        'kekik' => ['thyme', 'мащерка', 'θυμάρι'],
        'ton balığı' => ['tuna', 'риба тон', 'τόνος'],
        'füme dana kaburga' => ['smoked beef rib', 'пушено телешко ребро', 'καπνιστό μοσχαρίσιο παϊδάκι'],
        'füme kaburga' => ['smoked beef rib', 'пушено телешко ребро', 'καπνιστό μοσχαρίσιο παϊδάκι'],
        'domates' => ['tomatoes', 'домати', 'ντομάτες'],
        'eski kaşar' => ['aged kashar cheese', 'отлежал кашкавал', 'ώριμο κασέρι'],
        'zeytinyağı' => ['olive oil', 'зехтин', 'ελαιόλαδο'],
        'yumurta' => ['egg', 'яйце', 'αυγό'],
        'sarımsak sos' => ['garlic sauce', 'чеснов сос', 'σάλτσα σκόρδου'],
        'tavuk' => ['chicken', 'пиле', 'κοτόπουλο'],
        'krema' => ['cream', 'сметана', 'κρέμα'],
        'cheddar peyniri' => ['cheddar', 'чедър', 'τσένταρ'],
        'süt damlası peyniri' => ['fresh milk cheese', 'прясно сирене', 'φρέσκο τυρί'],
        'beyaz peynir' => ['white cheese', 'бяло сирене', 'λευκό τυρί'],
        'barbekü soslu tavuk' => ['BBQ chicken', 'пиле с барбекю сос', 'κοτόπουλο με σάλτσα μπάρμπεκιου'],
    ];

    private const LOCALES = ['en', 'bg', 'el'];

    public function run(): void
    {
        $business = Business::orderBy('id')->firstOrFail();

        $pizza = $this->category($business->id, 'Pizzalar', 1, ['Pizzas', 'Пици', 'Πίτσες']);
        $gurme = $this->category($business->id, 'Gurme Pizzalar', 2, ['Gourmet Pizzas', 'Гурме пици', 'Γκουρμέ πίτσες']);
        $tatli = $this->category($business->id, 'Tatlılar', 6, ['Desserts', 'Десерти', 'Επιδόρπια']);
        $sicak = $this->category($business->id, 'Sıcak İçecekler', 7, ['Hot Drinks', 'Топли напитки', 'Ζεστά ροφήματα']);
        $soguk = $this->category($business->id, 'İçecekler', 8, ['Drinks', 'Напитки', 'Ποτά']);

        // Pizzalar: Küçük / Orta / Büyük, ilaveler açık
        $classic = [295, 375, 510];
        $gourmet = [365, 485, 630];
        $pizzas = [
            [$pizza, 'ODRİN', null, 'Pizza sosu, mozzarella, jambon, kapya biber, zeytin, mısır', $classic],
            [$pizza, 'SUCUKLU', ['SUCUK', 'СУДЖУК', 'ΣΟΥΤΖΟΥΚΙ'], 'Pizza sosu, mozzarella, sucuk', $classic],
            [$pizza, 'KÖZLÜCE', null, 'Pizza sosu, mozzarella, köz patlıcan, köz kapya biber, roka, baharat, sarımsaklı zeytinyağı', $classic, ['vegetarian' => true]],
            [$gurme, 'AZRA (ACILI ETLİ)', ['AZRA (SPICY, MEAT)', 'АЗРА (ЛЮТА, С МЕСО)', 'AZRA (ΚΑΥΤΕΡΗ, ΜΕ ΚΡΕΑΣ)'], 'Pizza sosu, mozzarella, kavurma, soğan, mantar, jalapeno biber', $gourmet],
            [$gurme, 'EDİRNE ATEŞİ', ['EDIRNE FIRE', 'ОГЪНЯТ НА ОДРИН', 'Η ΦΩΤΙΑ ΤΗΣ ΑΔΡΙΑΝΟΥΠΟΛΗΣ'], 'Pizza sosu, mozzarella, küp sucuk, pastırma, cherry domates, karaağaç biberi', $gourmet],
            [$gurme, 'ASLAN (ETLİ)', ['ASLAN (MEAT)', 'АСЛАН (С МЕСО)', 'ASLAN (ΜΕ ΚΡΕΑΣ)'], 'Pizza sosu, mozzarella, sucuk, kavurma, pastırma', $gourmet],
            [$gurme, 'KONYALIM', null, 'Pizza sosu, mozzarella, sucuk, biber, mantar, pastırma', $gourmet],
            [$gurme, 'TON BALIKLI', ['TUNA', 'РИБА ТОН', 'ΤΟΝΟΣ'], 'Pizza sosu, mozzarella, kekik, ton balığı, mısır', $gourmet],
            [$gurme, 'SULTAN', null, 'Pizza sosu, mozzarella, füme dana kaburga, mısır, sucuk, kapya biber, domates', $gourmet],
            [$gurme, 'İMPERİA', ['IMPERIA', 'ИМПЕРИЯ', 'IMPERIA'], 'Mozzarella peyniri, pizza sosu, füme kaburga, eski kaşar, roka, domates, zeytin, zeytinyağı', $gourmet],
            [$gurme, 'FÜLFÜL', null, 'Mozzarella peyniri, pizza sosu, pastırma, yumurta, jalapeno biber', $gourmet, ['allergens' => ['Gluten', 'Süt', 'Yumurta']]],
            [$gurme, 'ANADOL', null, 'Mozzarella peyniri, pizza sosu, sucuk, mantar, sarımsak sos, soğan, biber, jalapeno biber, domates, baharat', $gourmet],
            [$gurme, 'PESTOLU', ['PESTO', 'ПЕСТО', 'ΠΕΣΤΟ'], 'Mozzarella, pizza sosu, tavuk, krema, mantar', $gourmet],
            [$gurme, '5 PEYNİRLİ', ['5 CHEESE', '5 СИРЕНА', '5 ΤΥΡΙΑ'], 'Mozzarella peyniri, pizza sosu, cheddar peyniri, süt damlası peyniri, roka, eski kaşar, beyaz peynir', $gourmet, ['vegetarian' => true]],
            [$gurme, 'BARBEKÜ TAVUKLU', ['BBQ CHICKEN', 'ПИЛЕ БАРБЕКЮ', 'ΚΟΤΟΠΟΥΛΟ BBQ'], 'Pizza sosu, mozzarella, barbekü soslu tavuk, biber, soğan', $gourmet],
        ];

        foreach ($pizzas as $i => $row) {
            [$cat, $name, $names, $desc, [$s, $m, $l]] = $row;
            $opts = $row[5] ?? [];
            $this->product($business->id, $cat, $name, $names, $i + 1, [
                // Kısa açıklama = malzemeler (panel kuralıyla aynı)
                'description' => $desc,
                'ingredients' => $desc,
                'sizes' => ['small' => $s, 'medium' => $m, 'large' => $l],
                'price' => $m,
                'has_extras' => true,
                'is_vegetarian' => $opts['vegetarian'] ?? false,
                // Hamur ve mozzarella her pizzada var
                'allergens' => $opts['allergens'] ?? ['Gluten', 'Süt'],
            ]);
        }

        // Tek fiyatlı ürünler
        $single = [
            [$tatli, 'SUFLE', ['SOUFFLÉ', 'СУФЛЕ', 'ΣΟΥΦΛΕ'], 200],
            [$tatli, 'WAFFIZZA', null, 350],
            [$tatli, 'FONDÜ', ['FONDUE', 'ФОНДЮ', 'ΦΟΝΤΙ'], 230],
            [$sicak, 'ÇAY', ['TEA', 'ЧАЙ', 'ΤΣΑΪ'], 35],
            [$sicak, 'TÜRK KAHVESİ', ['TURKISH COFFEE', 'ТУРСКО КАФЕ', 'ΤΟΥΡΚΙΚΟΣ ΚΑΦΕΣ'], 125],
            [$sicak, 'ESPRESSO', ['ESPRESSO', 'ЕСПРЕСО', 'ESPRESSO'], 125],
            [$sicak, 'AMERICANO', ['AMERICANO', 'АМЕРИКАНО', 'AMERICANO'], 150],
            // Basılı menüde fiyatı boş: gizli eklenir, fiyat girilince panelden gösterilir
            [$sicak, 'MOCHA', ['MOCHA', 'МОКА', 'MOCHA'], null],
            [$sicak, 'LATTE', ['LATTE', 'ЛАТЕ', 'LATTE'], 150],
            [$sicak, 'SÜTLÜ KAHVE', ['COFFEE WITH MILK', 'КАФЕ С МЛЯКО', 'ΚΑΦΕΣ ΜΕ ΓΑΛΑ'], 150],
            [$sicak, 'SADE KAHVE', ['BLACK COFFEE', 'ЧЕРНО КАФЕ', 'ΣΚΕΤΟΣ ΚΑΦΕΣ'], 150],
            [$soguk, 'COLA', ['COLA', 'КОЛА', 'ΚΟΛΑ'], 85],
            [$soguk, 'FANTA', ['FANTA', 'ФАНТА', 'FANTA'], 85],
            [$soguk, 'SPRITE', ['SPRITE', 'СПРАЙТ', 'SPRITE'], 85],
            [$soguk, 'ICE TEA', ['ICE TEA', 'СТУДЕН ЧАЙ', 'ΠΑΓΩΜΕΝΟ ΤΣΑΪ'], 85],
            [$soguk, 'MEYVE SUYU', ['FRUIT JUICE', 'ПЛОДОВ СОК', 'ΧΥΜΟΣ ΦΡΟΥΤΩΝ'], 85],
            [$soguk, 'AYRAN', ['AYRAN (YOGURT DRINK)', 'АЙРЯН', 'ΑΪΡΑΝ'], 60],
            [$soguk, 'SODA', ['SPARKLING WATER', 'ГАЗИРАНА ВОДА', 'ΑΝΘΡΑΚΟΥΧΟ ΝΕΡΟ'], 50],
            [$soguk, 'SU', ['WATER', 'ВОДА', 'ΝΕΡΟ'], 30],
        ];

        foreach ($single as $i => [$cat, $name, $names, $price]) {
            $this->product($business->id, $cat, $name, $names, 100 + $i, [
                'sizes' => ['medium' => $price ?? 0],
                'price' => $price ?? 0,
                'is_visible' => $price !== null,
            ]);
        }
    }

    private function category(int $businessId, string $name, int $sortOrder, array $names): Category
    {
        $category = Category::firstOrNew(['business_id' => $businessId, 'name' => $name]);
        if (!$category->exists) {
            $category->sort_order = $sortOrder;
            $category->translations = $this->localized($names, 'name');
            $category->save();
            $this->command?->info("Kategori eklendi: $name");
        }

        return $category;
    }

    private function product(int $businessId, Category $category, string $name, ?array $names, int $sortOrder, array $attrs): void
    {
        $key = mb_strtoupper($name, 'UTF-8');
        $exists = Product::where('business_id', $businessId)->get(['name'])
            ->contains(fn ($p) => mb_strtoupper($p->name, 'UTF-8') === $key);
        if ($exists) {
            $this->command?->warn("Atlandı (zaten var): $name");
            return;
        }

        // Çeviriler: ad (verildiyse) + malzeme listesi sözlükten
        $translations = [];
        foreach (self::LOCALES as $i => $locale) {
            if ($names) {
                $translations[$locale]['name'] = $names[$i];
            }
            if (!empty($attrs['description'])) {
                $translations[$locale]['description'] = $this->translateList($attrs['description'], $i);
                $translations[$locale]['ingredients'] = $translations[$locale]['description'];
            }
        }

        Product::create($attrs + [
            'business_id' => $businessId,
            'category_id' => $category->id,
            'name' => $name,
            'translations' => $translations ?: null,
            'sort_order' => $sortOrder,
            'is_active' => true,
            'is_visible' => true,
        ]);
        $this->command?->info("Ürün eklendi: $name");
    }

    private function translateList(string $list, int $langIndex): string
    {
        return collect(explode(',', $list))
            ->map(fn ($term) => trim($term))
            ->map(fn ($term) => self::TERMS[$term][$langIndex] ?? throw new \RuntimeException("Sözlükte yok: $term"))
            ->implode(', ');
    }

    private function localized(array $names, string $field): array
    {
        return collect(self::LOCALES)->mapWithKeys(fn ($l, $i) => [$l => [$field => $names[$i]]])->all();
    }
}
