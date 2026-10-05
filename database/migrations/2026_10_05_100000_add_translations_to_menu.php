<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * QR menü dil desteği: Türkçe alanlar asıl kalır; İngilizce (en), Bulgarca (bg), Yunanca (el)
     * çevirileri translations sütununda tutulur: {"en": {"name": …, "description": …, "ingredients": …}, …}.
     * Çevirisi olmayan alan müşteriye Türkçe gösterilir.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->json('translations')->nullable()->after('ingredients');
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->json('translations')->nullable()->after('name');
        });

        // Mevcut menünün çevirileri (yalnızca adı eşleşen ve henüz çevirisi olmayan kayıtlar)
        foreach (self::CATEGORIES as $name => $tr) {
            DB::table('categories')->where('name', $name)->whereNull('translations')
                ->update(['translations' => json_encode($tr, JSON_UNESCAPED_UNICODE)]);
        }
        foreach (self::PRODUCTS as $name => $tr) {
            DB::table('products')->where('name', $name)->whereNull('translations')
                ->update(['translations' => json_encode($tr, JSON_UNESCAPED_UNICODE)]);
        }
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('translations'));
        Schema::table('categories', fn (Blueprint $table) => $table->dropColumn('translations'));
    }

    private const CATEGORIES = [
        'Pizzalar' => ['en' => ['name' => 'Pizzas'], 'bg' => ['name' => 'Пици'], 'el' => ['name' => 'Πίτσες']],
        'Tatlı Pizzalar' => ['en' => ['name' => 'Dessert Pizzas'], 'bg' => ['name' => 'Десертни пици'], 'el' => ['name' => 'Γλυκές πίτσες']],
        'Salatalar' => ['en' => ['name' => 'Salads'], 'bg' => ['name' => 'Салати'], 'el' => ['name' => 'Σαλάτες']],
        'İçecekler' => ['en' => ['name' => 'Drinks'], 'bg' => ['name' => 'Напитки'], 'el' => ['name' => 'Ποτά']],
    ];

    // Pizza adları İtalyanca olduğu için her dilde aynı kalır (yalnızca açıklama/malzeme çevrilir)
    private const PRODUCTS = [
        'MARGHERITA' => [
            'en' => ['description' => 'San Marzano tomatoes, mozzarella, basil, olive oil', 'ingredients' => 'San Marzano tomatoes, fresh mozzarella, basil, cold-pressed extra virgin olive oil'],
            'bg' => ['description' => 'Домати Сан Марцано, моцарела, босилек, зехтин', 'ingredients' => 'Домати Сан Марцано, прясна моцарела, босилек, студено пресован екстра върджин зехтин'],
            'el' => ['description' => 'Ντομάτες San Marzano, μοτσαρέλα, βασιλικός, ελαιόλαδο', 'ingredients' => 'Ντομάτες San Marzano, φρέσκια μοτσαρέλα, βασιλικός, έξτρα παρθένο ελαιόλαδο ψυχρής έκθλιψης'],
        ],
        'DIAVOLA' => [
            'en' => ['description' => 'San Marzano tomatoes, mozzarella, sucuk (spicy beef sausage), chili oil', 'ingredients' => 'San Marzano tomatoes, fresh mozzarella, spicy beef sucuk, chili pepper, chili olive oil'],
            'bg' => ['description' => 'Домати Сан Марцано, моцарела, суджук, люто олио', 'ingredients' => 'Домати Сан Марцано, прясна моцарела, лют телешки суджук, чушка чили, лют зехтин'],
            'el' => ['description' => 'Ντομάτες San Marzano, μοτσαρέλα, σουτζούκι, καυτερό λάδι', 'ingredients' => 'Ντομάτες San Marzano, φρέσκια μοτσαρέλα, πικάντικο μοσχαρίσιο σουτζούκι, τσίλι, καυτερό ελαιόλαδο'],
        ],
        'FUNGHI' => [
            'en' => ['description' => 'Mozzarella, mushrooms, truffle oil, parmesan', 'ingredients' => 'White base, fresh mozzarella, sautéed chestnut mushrooms, white truffle oil, shaved parmesan'],
            'bg' => ['description' => 'Моцарела, гъби, трюфелово масло, пармезан', 'ingredients' => 'Бяла основа, прясна моцарела, задушени кафяви печурки, бяло трюфелово масло, люспи пармезан'],
            'el' => ['description' => 'Μοτσαρέλα, μανιτάρια, λάδι τρούφας, παρμεζάνα', 'ingredients' => 'Λευκή βάση, φρέσκια μοτσαρέλα, σοταρισμένα καφέ μανιτάρια, λάδι λευκής τρούφας, φλοίδες παρμεζάνας'],
        ],
        'PROSCIUTTO' => [
            'en' => ['description' => 'San Marzano tomatoes, mozzarella, beef ham, rocket, parmesan', 'ingredients' => 'San Marzano tomatoes, mozzarella, beef ham added after baking, fresh rocket, parmesan shavings, extra virgin olive oil'],
            'bg' => ['description' => 'Домати Сан Марцано, моцарела, телешка шунка, рукола, пармезан', 'ingredients' => 'Домати Сан Марцано, моцарела, телешка шунка (след изпичане), прясна рукола, люспи пармезан, екстра върджин зехтин'],
            'el' => ['description' => 'Ντομάτες San Marzano, μοτσαρέλα, μοσχαρίσιο ζαμπόν, ρόκα, παρμεζάνα', 'ingredients' => 'Ντομάτες San Marzano, μοτσαρέλα, μοσχαρίσιο ζαμπόν μετά το ψήσιμο, φρέσκια ρόκα, φλοίδες παρμεζάνας, έξτρα παρθένο ελαιόλαδο'],
        ],
        'BURRATA' => [
            'en' => ['description' => 'San Marzano tomatoes, burrata, basil, olive oil', 'ingredients' => 'San Marzano tomato sauce, 125 g fresh burrata, fresh basil, cold-pressed extra virgin olive oil'],
            'bg' => ['description' => 'Домати Сан Марцано, бурата, босилек, зехтин', 'ingredients' => 'Доматен сос Сан Марцано, 125 г прясна бурата, пресен босилек, студено пресован екстра върджин зехтин'],
            'el' => ['description' => 'Ντομάτες San Marzano, μπουράτα, βασιλικός, ελαιόλαδο', 'ingredients' => 'Σάλτσα ντομάτας San Marzano, 125 γρ. φρέσκια μπουράτα, φρέσκος βασιλικός, έξτρα παρθένο ελαιόλαδο ψυχρής έκθλιψης'],
        ],
        'NUTELLA & FINDIK PIZZA' => [
            'en' => ['name' => 'NUTELLA & HAZELNUT PIZZA', 'description' => 'Nutella, roasted hazelnut pieces, powdered sugar', 'ingredients' => 'Crispy pizza dough, generous Nutella, roasted mountain hazelnuts from Edirne, powdered sugar'],
            'bg' => ['name' => 'ПИЦА НУТЕЛА И ЛЕШНИЦИ', 'description' => 'Нутела, парченца печени лешници, пудра захар', 'ingredients' => 'Хрупкаво тесто за пица, обилно нутела, печени планински лешници от Одрин, пудра захар'],
            'el' => ['name' => 'ΠΙΤΣΑ NUTELLA & ΦΟΥΝΤΟΥΚΙ', 'description' => 'Nutella, κομματάκια καβουρδισμένου φουντουκιού, άχνη ζάχαρη', 'ingredients' => 'Τραγανή ζύμη πίτσας, άφθονη Nutella, καβουρδισμένα ορεινά φουντούκια Αδριανούπολης, άχνη ζάχαρη'],
        ],
        'ROKA PARMESAN SALATASI' => [
            'en' => ['name' => 'ROCKET & PARMESAN SALAD', 'description' => 'Fresh rocket, cherry tomatoes, parmesan flakes, pomegranate molasses, olive oil', 'ingredients' => 'Baby rocket leaves, sun-dried and cherry tomatoes, parmesan shavings, walnuts, organic pomegranate molasses dressing'],
            'bg' => ['name' => 'САЛАТА С РУКОЛА И ПАРМЕЗАН', 'description' => 'Прясна рукола, чери домати, люспи пармезан, наров сироп, зехтин', 'ingredients' => 'Бейби рукола, сушени и чери домати, люспи пармезан, орехи, дресинг от органичен наров сироп'],
            'el' => ['name' => 'ΣΑΛΑΤΑ ΡΟΚΑ ΜΕ ΠΑΡΜΕΖΑΝΑ', 'description' => 'Φρέσκια ρόκα, ντοματίνια, φλοίδες παρμεζάνας, πετιμέζι ροδιού, ελαιόλαδο', 'ingredients' => 'Τρυφερά φύλλα ρόκας, λιαστές ντομάτες και ντοματίνια, φλοίδες παρμεζάνας, καρύδια, ντρέσινγκ με βιολογικό πετιμέζι ροδιού'],
        ],
        'KUTU KOLA 330ML' => [
            'en' => ['name' => 'COLA CAN 330ML', 'description' => 'Chilled cola in a can', 'ingredients' => 'Cola, 330 ml can'],
            'bg' => ['name' => 'КОЛА КЕН 330МЛ', 'description' => 'Студена кола в кен', 'ingredients' => 'Кола, кен 330 мл'],
            'el' => ['name' => 'ΚΟΛΑ ΚΟΥΤΙ 330ML', 'description' => 'Παγωμένη κόλα σε κουτί', 'ingredients' => 'Κόλα, κουτί 330 ml'],
        ],
        'EV YAPIMI LİMONATA' => [
            'en' => ['name' => 'HOMEMADE LEMONADE', 'description' => 'Freshly squeezed lemon, mint leaves, lightly sweetened', 'ingredients' => 'Lemon juice, grated lemon zest, fresh mint leaves, beet sugar'],
            'bg' => ['name' => 'ДОМАШНА ЛИМОНАДА', 'description' => 'Прясно изцеден лимон, листа мента, слабо подсладена', 'ingredients' => 'Лимонов сок, настъргана лимонова кора, пресни листа мента, захар от цвекло'],
            'el' => ['name' => 'ΣΠΙΤΙΚΗ ΛΕΜΟΝΑΔΑ', 'description' => 'Φρεσκοστυμμένο λεμόνι, φύλλα δυόσμου, με λίγη ζάχαρη', 'ingredients' => 'Χυμός λεμονιού, τριμμένη φλούδα λεμονιού, φρέσκα φύλλα δυόσμου, ζάχαρη από τεύτλα'],
        ],
        'DOĞAL MADEN SUYU' => [
            'en' => ['name' => 'SPARKLING MINERAL WATER', 'description' => 'Natural mineral water, 200 ml glass bottle', 'ingredients' => 'Naturally carbonated mineral water'],
            'bg' => ['name' => 'ГАЗИРАНА МИНЕРАЛНА ВОДА', 'description' => 'Натурална минерална вода, стъклена бутилка 200 мл', 'ingredients' => 'Натурално газирана минерална вода'],
            'el' => ['name' => 'ΑΝΘΡΑΚΟΥΧΟ ΜΕΤΑΛΛΙΚΟ ΝΕΡΟ', 'description' => 'Φυσικό μεταλλικό νερό, γυάλινο μπουκάλι 200 ml', 'ingredients' => 'Φυσικό ανθρακούχο μεταλλικό νερό'],
        ],
    ];
};
