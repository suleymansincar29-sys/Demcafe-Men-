'use strict';
// İlk kurulumda veritabanına yüklenen örnek menü. Yönetici panelinden tamamı değiştirilebilir.

const categories = [
  { slug: 'sicak-kahveler', tr: 'Sıcak Kahveler', en: 'Hot Coffees', art: 'hot-coffee' },
  { slug: 'soguk-kahveler', tr: 'Soğuk Kahveler', en: 'Iced Coffees', art: 'iced-coffee' },
  { slug: 'turk-kahvesi', tr: 'Türk Kahvesi', en: 'Turkish Coffee', art: 'turkish-coffee' },
  { slug: 'caylar', tr: 'Çaylar', en: 'Teas', art: 'tea' },
  { slug: 'soguk-icecekler', tr: 'Soğuk İçecekler', en: 'Cold Drinks', art: 'lemonade' },
  { slug: 'milkshake', tr: 'Milkshake', en: 'Milkshakes', art: 'milkshake' },
  { slug: 'frozen', tr: 'Frozen', en: 'Frozen', art: 'frozen' },
  { slug: 'smoothie', tr: 'Smoothie', en: 'Smoothies', art: 'smoothie' },
  { slug: 'tatlilar', tr: 'Tatlılar', en: 'Desserts', art: 'dessert' },
  { slug: 'pastalar', tr: 'Pastalar', en: 'Cakes', art: 'cake' },
  { slug: 'atistirmaliklar', tr: 'Atıştırmalıklar', en: 'Snacks', art: 'snack' },
  { slug: 'kahvaltiliklar', tr: 'Kahvaltılıklar', en: 'Breakfast', art: 'breakfast' },
];

// [kategori, ad TR, ad EN, açıklama TR, açıklama EN, içerik TR, içerik EN, fiyat ₺, popüler, yeni, kcal]
const P = [
  ['sicak-kahveler', 'Espresso', 'Espresso', 'Yoğun gövdeli, kremalı tek shot.', 'A rich, crema-topped single shot.', '%100 Arabica çekirdek', '100% Arabica beans', 110, 0, 0, 5],
  ['sicak-kahveler', 'Americano', 'Americano', 'Sıcak suyla açılmış çift shot espresso.', 'Double espresso lengthened with hot water.', 'Çift espresso, sıcak su', 'Double espresso, hot water', 140, 0, 0, 10],
  ['sicak-kahveler', 'DEM Latte', 'DEM Latte', 'İpeksi süt köpüğü ve imza karamel dokunuşu.', 'Silky milk foam with our signature caramel touch.', 'Espresso, buharda süt, ev yapımı karamel', 'Espresso, steamed milk, house caramel', 175, 1, 0, 210],
  ['sicak-kahveler', 'Cappuccino', 'Cappuccino', 'Eşit oranda espresso, süt ve kadifemsi köpük.', 'Equal parts espresso, milk and velvety foam.', 'Espresso, süt, süt köpüğü', 'Espresso, milk, milk foam', 165, 0, 0, 130],
  ['sicak-kahveler', 'Flat White', 'Flat White', 'Çift ristretto üzerine ince mikro köpük.', 'Double ristretto under a thin microfoam.', 'Çift ristretto, süt', 'Double ristretto, milk', 170, 0, 1, 120],
  ['sicak-kahveler', 'Mocha', 'Mocha', 'Belçika çikolatası ile espresso buluşması.', 'Espresso meets Belgian chocolate.', 'Espresso, bitter çikolata, süt, krema', 'Espresso, dark chocolate, milk, cream', 185, 0, 0, 290],

  ['soguk-kahveler', 'Iced Latte', 'Iced Latte', 'Buz üzerinde soğuk süt ve espresso.', 'Espresso and cold milk over ice.', 'Espresso, soğuk süt, buz', 'Espresso, cold milk, ice', 180, 1, 0, 150],
  ['soguk-kahveler', 'Cold Brew', 'Cold Brew', '18 saat soğuk demlenmiş, yumuşak içim.', 'Steeped cold for 18 hours, ultra smooth.', 'Soğuk demleme kahve, buz', 'Cold brew coffee, ice', 175, 0, 0, 5],
  ['soguk-kahveler', 'Iced Caramel Macchiato', 'Iced Caramel Macchiato', 'Vanilyalı süt, espresso ve karamel sos katmanları.', 'Layers of vanilla milk, espresso and caramel.', 'Espresso, süt, vanilya, karamel sos', 'Espresso, milk, vanilla, caramel sauce', 195, 0, 1, 240],
  ['soguk-kahveler', 'Espresso Tonic', 'Espresso Tonic', 'Tonik ve portakal kabuğu ile ferah bir twist.', 'A bright twist with tonic and orange peel.', 'Espresso, tonik, portakal kabuğu', 'Espresso, tonic, orange peel', 190, 0, 0, 80],

  ['turk-kahvesi', 'Türk Kahvesi', 'Turkish Coffee', 'Bakır cezvede, lokum eşliğinde.', 'Brewed in a copper cezve, served with Turkish delight.', 'Türk kahvesi, lokum', 'Turkish coffee, Turkish delight', 110, 1, 0, 20],
  ['turk-kahvesi', 'Damla Sakızlı Türk Kahvesi', 'Mastic Turkish Coffee', 'Sakız aromasıyla hafif ve ferah.', 'Light and aromatic with Chios mastic.', 'Türk kahvesi, damla sakızı', 'Turkish coffee, mastic', 120, 0, 0, 25],
  ['turk-kahvesi', 'Dibek Kahvesi', 'Dibek Coffee', 'Taş dibekte dövülmüş, yumuşak içimli.', 'Stone-ground, smooth and mild.', 'Dibek kahvesi, süt tozu', 'Dibek coffee blend', 120, 0, 0, 40],
  ['turk-kahvesi', 'Menengiç Kahvesi', 'Menengiç Coffee', 'Kafeinsiz, sütlü yabani fıstık kahvesi.', 'Caffeine-free terebinth coffee with milk.', 'Menengiç, süt', 'Terebinth, milk', 125, 0, 0, 160],

  ['caylar', 'DEM Çay', 'DEM Tea', 'İnce belli bardakta tavşan kanı demli çay.', 'Rich black tea in a classic tulip glass.', 'Rize siyah çayı', 'Rize black tea', 40, 1, 0, 0],
  ['caylar', 'Fincan Çay', 'Tea in a Cup', 'Büyük fincanda demli siyah çay.', 'Brewed black tea in a large cup.', 'Rize siyah çayı', 'Rize black tea', 60, 0, 0, 0],
  ['caylar', 'Yeşil Çay', 'Green Tea', 'Hafif ve ferahlatıcı sencha.', 'Light and refreshing sencha.', 'Sencha yeşil çay', 'Sencha green tea', 90, 0, 0, 0],
  ['caylar', 'Kış Çayı', 'Winter Tea', 'Ihlamur, tarçın, karanfil ve portakal.', 'Linden, cinnamon, clove and orange.', 'Ihlamur, tarçın, karanfil, portakal', 'Linden, cinnamon, clove, orange', 110, 0, 1, 15],
  ['caylar', 'Chai Tea Latte', 'Chai Tea Latte', 'Baharatlı siyah çay ve köpüklü süt.', 'Spiced black tea with frothed milk.', 'Chai baharatı, siyah çay, süt', 'Chai spices, black tea, milk', 160, 0, 0, 190],

  ['soguk-icecekler', 'Ev Yapımı Limonata', 'Homemade Lemonade', 'Taze sıkım limon ve nane.', 'Freshly squeezed lemons with mint.', 'Limon, nane, şeker şurubu', 'Lemon, mint, simple syrup', 120, 1, 0, 110],
  ['soguk-icecekler', 'Çilekli Limonata', 'Strawberry Lemonade', 'Çilek püresiyle meyvemsi limonata.', 'Fruity lemonade with strawberry purée.', 'Limon, çilek püresi', 'Lemon, strawberry purée', 135, 0, 0, 130],
  ['soguk-icecekler', 'Taze Portakal Suyu', 'Fresh Orange Juice', 'Siparişle sıkılır.', 'Squeezed to order.', 'Portakal', 'Orange', 130, 0, 0, 120],
  ['soguk-icecekler', 'Soda', 'Sparkling Water', 'Sade veya limonlu.', 'Plain or with lemon.', 'Maden suyu', 'Mineral water', 45, 0, 0, 0],

  ['milkshake', 'Çikolatalı Milkshake', 'Chocolate Milkshake', 'Belçika çikolatası ve krema.', 'Belgian chocolate and whipped cream.', 'Süt, dondurma, çikolata, krema', 'Milk, ice cream, chocolate, cream', 190, 1, 0, 480],
  ['milkshake', 'Çilekli Milkshake', 'Strawberry Milkshake', 'Taze çilek ve vanilyalı dondurma.', 'Fresh strawberries with vanilla ice cream.', 'Süt, dondurma, çilek', 'Milk, ice cream, strawberry', 185, 0, 0, 420],
  ['milkshake', 'Lotus Milkshake', 'Lotus Milkshake', 'Karamelize bisküvi ile.', 'With caramelised biscuit.', 'Süt, dondurma, Lotus bisküvi', 'Milk, ice cream, Lotus biscuit', 205, 0, 1, 520],
  ['milkshake', 'Vanilyalı Milkshake', 'Vanilla Milkshake', 'Klasik, sade ve kremamsı.', 'Classic, simple and creamy.', 'Süt, vanilyalı dondurma', 'Milk, vanilla ice cream', 180, 0, 0, 400],

  ['frozen', 'Mango Frozen', 'Mango Frozen', 'Buzlu mango, tropik serinlik.', 'Icy mango, tropical chill.', 'Mango püresi, buz', 'Mango purée, ice', 165, 1, 0, 180],
  ['frozen', 'Orman Meyveli Frozen', 'Berry Frozen', 'Böğürtlen, ahududu ve yaban mersini.', 'Blackberry, raspberry and blueberry.', 'Orman meyveleri, buz', 'Mixed berries, ice', 165, 0, 0, 170],
  ['frozen', 'Karpuzlu Frozen', 'Watermelon Frozen', 'Yaz klasiği, naneli.', 'A summer classic with mint.', 'Karpuz, nane, buz', 'Watermelon, mint, ice', 160, 0, 1, 140],

  ['smoothie', 'Muz & Çilek Smoothie', 'Banana & Strawberry Smoothie', 'Yoğurt bazlı, doyurucu.', 'Yoghurt-based and filling.', 'Muz, çilek, yoğurt, bal', 'Banana, strawberry, yoghurt, honey', 175, 1, 0, 260],
  ['smoothie', 'Yeşil Detoks', 'Green Detox', 'Ispanak, elma, zencefil ve limon.', 'Spinach, apple, ginger and lemon.', 'Ispanak, yeşil elma, zencefil, limon', 'Spinach, green apple, ginger, lemon', 180, 0, 0, 150],
  ['smoothie', 'Berry Blast', 'Berry Blast', 'Orman meyveleri ve muz.', 'Mixed berries and banana.', 'Orman meyveleri, muz, süt', 'Mixed berries, banana, milk', 180, 0, 0, 230],

  ['tatlilar', 'Fıstıklı Baklava', 'Pistachio Baklava', 'Antep fıstıklı, 4 dilim.', 'Antep pistachio, 4 pieces.', 'Yufka, Antep fıstığı, tereyağı, şerbet', 'Filo, pistachio, butter, syrup', 260, 1, 0, 520],
  ['tatlilar', 'Tiramisu', 'Tiramisu', 'Espresso ile ıslatılmış kedidili ve mascarpone.', 'Espresso-soaked ladyfingers with mascarpone.', 'Mascarpone, kedidili, espresso, kakao', 'Mascarpone, ladyfingers, espresso, cocoa', 210, 0, 0, 450],
  ['tatlilar', 'Sıcak Brownie', 'Warm Brownie', 'Vanilyalı dondurma eşliğinde.', 'Served with vanilla ice cream.', 'Bitter çikolata, ceviz, dondurma', 'Dark chocolate, walnut, ice cream', 220, 0, 0, 560],
  ['tatlilar', 'Fırın Sütlaç', 'Baked Rice Pudding', 'Geleneksel, üzeri karamelize.', 'Traditional, caramelised on top.', 'Süt, pirinç, şeker', 'Milk, rice, sugar', 150, 0, 0, 310],

  ['pastalar', 'San Sebastian', 'San Sebastian Cheesecake', 'Akışkan iç, yanık üst. Çikolata sosla.', 'Creamy centre, burnt top. With chocolate sauce.', 'Krem peynir, yumurta, krema', 'Cream cheese, eggs, cream', 240, 1, 0, 480],
  ['pastalar', 'Çilekli Pasta', 'Strawberry Cake', 'Pandispanya, krema ve taze çilek.', 'Sponge, cream and fresh strawberries.', 'Pandispanya, krema, çilek', 'Sponge, cream, strawberry', 210, 0, 0, 390],
  ['pastalar', 'Frambuazlı Cheesecake', 'Raspberry Cheesecake', 'Frambuaz soslu klasik cheesecake.', 'Classic cheesecake with raspberry coulis.', 'Krem peynir, bisküvi, frambuaz', 'Cream cheese, biscuit, raspberry', 230, 0, 1, 450],
  ['pastalar', 'Havuçlu Tarçınlı Kek', 'Carrot Cinnamon Cake', 'Cevizli, krem peynir kaplamalı.', 'With walnuts and cream cheese frosting.', 'Havuç, ceviz, tarçın, krem peynir', 'Carrot, walnut, cinnamon, cream cheese', 195, 0, 0, 410],

  ['atistirmaliklar', 'Kaşarlı Tost', 'Cheese Toastie', 'Ekşi mayalı ekmekte eritilmiş kaşar.', 'Melted kashar on sourdough.', 'Ekşi mayalı ekmek, kaşar', 'Sourdough, kashar cheese', 170, 1, 0, 420],
  ['atistirmaliklar', 'Tereyağlı Kruvasan', 'Butter Croissant', 'Her sabah taze, katmer katmer.', 'Fresh every morning, flaky layers.', 'Un, tereyağı', 'Flour, butter', 120, 0, 0, 280],
  ['atistirmaliklar', 'Tavuklu Wrap', 'Chicken Wrap', 'Izgara tavuk, yeşillik ve yoğurtlu sos.', 'Grilled chicken, greens and yoghurt sauce.', 'Tavuk, lavaş, marul, domates, sos', 'Chicken, wrap, lettuce, tomato, sauce', 245, 0, 1, 510],
  ['atistirmaliklar', 'Patates Kızartması', 'French Fries', 'Çıtır, baharatlı.', 'Crispy and seasoned.', 'Patates, baharat', 'Potato, seasoning', 140, 0, 0, 380],

  ['kahvaltiliklar', 'DEM Serpme Kahvaltı (2 Kişilik)', 'DEM Breakfast Spread (for 2)', 'Peynirler, zeytinler, reçeller, sıcaklar ve sınırsız çay.', 'Cheeses, olives, jams, hot dishes and bottomless tea.', 'Beyaz peynir, kaşar, zeytin, bal, kaymak, reçel, sucuklu yumurta, simit, çay', 'White cheese, kashar, olives, honey, clotted cream, jam, eggs with sucuk, simit, tea', 950, 1, 0, null],
  ['kahvaltiliklar', 'Menemen', 'Menemen', 'Domates, biber ve yumurta, tavada.', 'Eggs with tomatoes and peppers, in the pan.', 'Yumurta, domates, sivri biber', 'Eggs, tomato, green pepper', 220, 0, 0, 340],
  ['kahvaltiliklar', 'Avokadolu Tost', 'Avocado Toast', 'Ekşi maya, avokado, poşe yumurta.', 'Sourdough, avocado, poached egg.', 'Ekşi mayalı ekmek, avokado, yumurta, pul biber', 'Sourdough, avocado, egg, chili flakes', 260, 0, 1, 430],
  ['kahvaltiliklar', 'Kahvaltı Tabağı', 'Breakfast Plate', 'Tek kişilik klasik kahvaltı.', 'Classic breakfast for one.', 'Peynir, zeytin, domates, salatalık, yumurta, bal, tereyağı', 'Cheese, olives, tomato, cucumber, egg, honey, butter', 380, 0, 0, null],
];

const products = P.map((r) => ({
  cat: r[0], name_tr: r[1], name_en: r[2], desc_tr: r[3], desc_en: r[4],
  ing_tr: r[5], ing_en: r[6], price: r[7], popular: r[8], isNew: r[9], kcal: r[10],
}));

const announcements = [
  { kind: 'campaign', title_tr: 'Kahve + Tatlı = %15 İndirim', title_en: 'Coffee + Dessert = 15% Off',
    body_tr: 'Hafta içi 14:00–17:00 arası tüm sıcak kahveler tatlı ile birlikte.', body_en: 'Weekdays 2–5 PM, any hot coffee with a dessert.' },
  { kind: 'info', title_tr: 'Yeni: Kış Çayı', title_en: 'New: Winter Tea',
    body_tr: 'Ihlamur, tarçın ve portakalın sıcacık buluşması menümüzde.', body_en: 'Linden, cinnamon and orange — now on the menu.' },
];

const settings = {
  cafe_name: 'DEM CAFE',
  slogan_tr: 'Her Yudumda Bir DEM',
  slogan_en: 'A little DEM in every sip',
  whatsapp: '905000000000',
  phone: '',
  address: '',
  instagram: '',
  hours: '08:00 – 23:00',
  table_count: '12',
  base_url: '',
  currency: '₺',
  seo_description: 'DEM CAFE dijital menü: sıcak ve soğuk kahveler, Türk kahvesi, çaylar, tatlılar, pastalar ve kahvaltılıklar.',
};

module.exports = { categories, products, announcements, settings };
