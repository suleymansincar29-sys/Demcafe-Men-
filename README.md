# DEM CAFE – Akıllı QR Menü Sistemi

Müşteri menüsü + çalışan yönetici paneli. Tek bir Node.js uygulaması; **harici paket gerektirmez**
(`npm install` yok). Veriler SQLite veritabanında, fotoğraflar diskte saklanır.

```
/            → Müşteri menüsü (QR'ın açtığı sayfa)
/masa/5      → Masa 5'e özel kalıcı bağlantı
/admin       → Yönetim paneli (şifreli giriş)
```

## Hızlı başlangıç (bilgisayarda deneme)

Gerekli: **Node.js 22.5 veya üzeri** (nodejs.org).

```bash
cd demcafe
ADMIN_PASSWORD="guclu-bir-parola" npm start
```

Tarayıcıda `http://localhost:3000` (menü) ve `http://localhost:3000/admin` (panel) açılır.
Kullanıcı adı: `admin`. `ADMIN_PASSWORD` vermezseniz ilk açılışta rastgele bir parola üretilip
konsola yazılır. Parolayı panelde **Ayarlar › Parola değiştir**'den değiştirebilirsiniz.

Parolayı unutursanız: `npm run set-password -- admin yeniParola123`

## Canlıya alma

Uygulama tek bir sunucu süreci ve kalıcı bir `data/` klasörü ister (veritabanı + yüklenen fotoğraflar).

**Docker (VPS, Coolify, CapRover vb.)**

```bash
docker compose up -d --build       # docker-compose.yml içindeki parolayı değiştirin
```

`demcafe-data` volume'u veritabanını ve fotoğrafları kalıcı tutar.

**Railway / Render / Fly.io**

- Start komutu: `npm start`
- Ortam değişkenleri: `ADMIN_PASSWORD`, `DATA_DIR=/data`, `TZ=Europe/Istanbul`
- `/data` yoluna **kalıcı disk (volume)** bağlayın. Disk bağlanmazsa her yeniden başlatmada veriler sıfırlanır.
- HTTPS'i platform sağlar; oturum çerezi HTTPS'te otomatik `Secure` olur.

**Canlıya aldıktan sonra:**

1. Panel › **Ayarlar › Site adresi** alanına kalıcı alan adınızı yazın (örn. `https://menu.demcafe.com`).
2. WhatsApp numarasını ülke koduyla girin (`905XXXXXXXXX`).
3. Panel › **QR Kodlar**'dan masa sayısını girip **Yazdır** deyin (A4'e 3'lü masa kartı çıkar)
   ya da her masanın SVG'sini indirip matbaaya verin.

QR kodlar `site-adresi/masa/N` biçimindeki kalıcı bağlantıları kodlar; menüyü ne kadar
değiştirirseniz değiştirin, basılı QR'ları yenilemeniz gerekmez.

## Yönetim paneli özellikleri

| Bölüm | Yapılabilenler |
|---|---|
| Ürünler | Ekle, düzenle, sil · fotoğraf yükle (tarayıcıda otomatik küçültülür, WEBP) · listeden tek dokunuşla fiyat değiştir · popüler ★ · stokta yok · satışa geçici kapat · ▲▼ ile sırala · kategoriler arası taşı · TR/EN ad, açıklama, içindekiler, kalori |
| Kategoriler | Ekle, yeniden adlandır, sırala, gizle, sil (ürünleri başka kategoriye taşıyarak veya birlikte) · varsayılan illüstrasyon seçimi |
| Duyurular | Kampanya / duyuru kartları · başlangıç–bitiş tarihi (otomatik yayın) · sırala · aç/kapat |
| QR Kodlar | Genel menü QR'ı + masa başına QR · SVG indir · A4 yazdırma şablonu |
| Ayarlar | İşletme adı, slogan (TR/EN), WhatsApp, telefon, adres, Instagram, saatler, site adresi, SEO açıklaması, parola |

Paneldeki her değişiklik açık olan tüm müşteri ekranlarına **anında** yansır (Server-Sent Events);
sayfayı yenilemek gerekmez.

## Teknik notlar

- **Veritabanı:** SQLite (`data/demcafe.db`, WAL modu). Yedek için `data/` klasörünü kopyalamak yeterli.
- **Görseller:** `data/uploads/`. Sunucu dosya türünü içerikten doğrular (JPG/PNG/WEBP, en fazla 8 MB);
  kullanılmayan görseller otomatik silinir. Fotoğrafı olmayan ürünlerde kategori illüstrasyonu gösterilir.
- **Güvenlik:** scrypt ile özetlenmiş parolalar · HttpOnly + SameSite=Strict oturum çerezi (7 gün) ·
  değiştiren isteklerde ek başlık kontrolü (CSRF) · giriş denemesi sınırı (15 dakikada 8) ·
  sıkı Content-Security-Policy · tüm çıktılar kaçışlı.
- **Hız / SEO:** Menü verisi HTML ile birlikte gelir (ek istek yok) · gzip · uzun süreli önbellek ·
  schema.org `CafeOrCoffeeShop` + `Menu` yapılandırılmış verisi · `robots.txt`, `sitemap.xml`, Open Graph.
- **Testler:** `npm test` (7 uçtan uca API testi).
- Varsayılan illüstrasyonları yeniden üretmek için: `node scripts/make-art.js`

## Dosya yapısı

```
server.js            HTTP sunucusu, API, oturum, yükleme, QR, SEO
lib/db.js            Şema + ilk kurulum
lib/seed.js          Örnek menü (12 kategori, 49 ürün)
lib/qr.js            QR → SVG (lib/qrcode: MIT lisanslı kodlayıcı)
public/              Müşteri menüsü (index.html, app.js, app.css), panel (admin.*), görseller
test/api.test.js     Testler
```
