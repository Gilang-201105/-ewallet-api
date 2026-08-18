# E-Wallet REST API

REST API untuk aplikasi e-wallet sederhana: Register, Login, Top Up, Payment, Transfer, Report
Transactions, dan Update Profile. Dibangun dengan Node.js, Express, dan Sequelize ORM.

## Tech stack

- **Node.js + Express** — HTTP server & routing
- **Sequelize ORM** (SQLite secara default; tinggal ganti dialect untuk Postgres/MySQL di produksi)
- **Sequelize CLI** — migrations (bukan `sync()`, supaya schema history jelas & bisa di-rollback)
- **JSON Web Token (jsonwebtoken)** — autentikasi
- **bcryptjs** — hashing PIN
- **express-validator** — validasi request body
- **Jest + Supertest** — unit/integration test
- **winston** — logging terstruktur

## Menjalankan proyek

```bash
npm install
cp .env.example .env        # sesuaikan JWT_SECRET dll bila perlu
npm run migrate             # membuat tabel via migration
npm start                   # menjalankan API di http://localhost:3000

# di terminal terpisah — WAJIB untuk fitur transfer, lihat penjelasan di bawah
npm run worker
```

Menjalankan test:

```bash
npm test
```

Dashboard monitoring background job (bonus): buka `http://localhost:3000/dashboard` setelah
`npm start` berjalan.

## Endpoint

| Method | URL             | Auth | Deskripsi                              |
|--------|-----------------|------|-----------------------------------------|
| POST   | `/register`     | -    | Registrasi user baru                    |
| POST   | `/login`        | -    | Login, mengembalikan JWT                |
| POST   | `/topup`        | JWT  | Menambah saldo                          |
| POST   | `/pay`          | JWT  | Melakukan pembayaran/pembelian          |
| POST   | `/transfer`     | JWT  | Transfer saldo ke user lain             |
| GET    | `/transactions` | JWT  | Riwayat seluruh transaksi milik user    |
| PUT    | `/profile`      | JWT  | Update `first_name` / `last_name` / `address` |

Semua request/response JSON mengikuti kontrak persis seperti pada dokumen spesifikasi
(`{ "status": "SUCCESS", "result": {...} }` untuk sukses, `{ "message": "..." }` untuk gagal).

Header untuk endpoint yang butuh auth: `Authorization: Bearer {access_token}` (didapat dari
response `/login`).

## Arsitektur data

Alih-alih tiga tabel terpisah (`top_ups`, `payments`, `transfers`), semua transaksi disimpan di
satu tabel ledger `transactions` dengan kolom `category` (`TOP_UP` / `PAYMENT` / `TRANSFER`) dan
`transaction_type` (`DEBIT` / `CREDIT`). ID generik `id` (UUID) di-map ulang menjadi
`top_up_id` / `payment_id` / `transfer_id` di response API sesuai kategorinya, jadi kontrak API
tetap sama persis dengan spesifikasi walau strukturnya satu tabel. Pendekatan ini membuat
`GET /transactions` cukup satu query, dan `balance_before`/`balance_after` konsisten untuk semua
jenis transaksi.

Setiap penyesuaian saldo (top up, payment, sisi debit transfer, sisi kredit transfer) dilakukan
di dalam satu **database transaction** dengan **row lock** (`SELECT ... FOR UPDATE` via
Sequelize `lock: t.LOCK.UPDATE`) pada baris user, supaya request yang berbarengan pada user yang
sama tidak menyebabkan race condition pada saldo.

## Transfer di background server

Ini bagian utama dari requirement "Transferring money should be executed in background server".

**Alur:**

1. `POST /transfer` memvalidasi saldo pengirim, langsung **mendebit saldo pengirim** dan menulis
   baris ledger DEBIT — semua di dalam satu DB transaction dengan row lock, supaya pengirim
   langsung mendapat `balance_before`/`balance_after` yang akurat sesuai kontrak API (respons
   SUCCESS langsung, tidak perlu polling).
2. Di transaction yang sama, sebuah baris **`transfer_jobs`** (job queue) dibuat dengan status
   `QUEUED`. Ini yang membuat pendebitan dan pengkreditan atomik dari sisi konsistensi data:
   kalau proses gagal di tengah jalan, tidak ada baris job yang "hilang".
3. Proses terpisah, **`src/queue/worker.js`** (dijalankan via `npm run worker`), melakukan
   polling ke tabel `transfer_jobs`. Untuk setiap job `QUEUED`, worker meng-klaim job tsb
   (row lock, supaya aman dijalankan multi-instance secara paralel), lalu **mengkredit saldo
   penerima** dan menulis baris ledger CREDIT untuk penerima, dan menandai job `DONE`.
4. Kalau proses gagal (mis. penerima terhapus), job dikembalikan ke `QUEUED` untuk dicoba lagi
   (retry, maksimum 5 kali) sebelum akhirnya ditandai `FAILED`. Semua tercatat lewat
   `error_message` dan `attempts` di tabel `transfer_jobs`, dan bisa dipantau lewat dashboard.

Kenapa didesain begini (bukan sekadar "kirim ke queue lalu return langsung tanpa validasi")?
Supaya kontrak API tetap sesuai spesifikasi (`/transfer` me-return `SUCCESS` dengan
`balance_before`/`balance_after` yang sudah final untuk pengirim), sementara bagian yang paling
masuk akal untuk didesentralisasi/di-background-kan — menulis ke akun pihak lain, yang dalam
sistem nyata bisa saja berbeda service/shard/database — betul-betul dieksekusi secara
asynchronous oleh proses worker terpisah, lengkap dengan retry.

**Bonus — mengganti polling dengan Redis-backed queue (Bull/BullMQ):** logika inti ada di
`src/queue/queueService.js` (`claimNextJob` + `processJob`), sudah menggunakan row-level locking
sehingga aman dijalankan sebagai job processor di Bull/BullMQ tanpa perubahan berarti — tinggal
ganti loop polling di `worker.js` dengan `queue.process(async (job) => processJob(...))`.

## Dashboard monitoring background job (bonus)

`GET /dashboard` menyajikan halaman HTML sederhana yang polling `GET /dashboard/jobs` setiap 3
detik, menampilkan ringkasan jumlah job per status (`QUEUED`/`PROCESSING`/`DONE`/`FAILED`) dan
daftar job terbaru — berguna untuk memantau kesehatan background worker tanpa perlu masuk ke
database langsung.

## ORM & migrations

Struktur database (`users`, `transactions`, `transfer_jobs`) didefinisikan lewat Sequelize
migrations di `src/migrations/`, bukan `sequelize.sync()`, supaya:
- Perubahan schema punya riwayat & bisa di-rollback (`npm run migrate:undo`)
- Mudah dipindah ke Postgres/MySQL di produksi tanpa mengubah migration (cukup ganti `dialect`
  di `src/config/config.js` / `.env`)

## Unit test

`npm test` menjalankan Jest + Supertest terhadap seluruh endpoint (register, login, top up,
payment, transfer, laporan transaksi, update profile) memakai SQLite in-memory, termasuk skenario
gagal (saldo tidak cukup, PIN salah, nomor telepon duplikat, token tidak valid) dan verifikasi
bahwa background worker benar-benar mengkredit saldo penerima.

## Struktur folder

```
src/
  app.js              # setup Express app
  server.js            # entrypoint API
  config/config.js     # konfigurasi Sequelize (dev/test/production)
  models/               # Sequelize models (User, Transaction, TransferJob)
  migrations/           # Sequelize migrations
  controllers/          # business logic per fitur
  routes/                # route definitions + validasi input
  middlewares/           # auth (JWT), validate, error handler
  queue/
    queueService.js      # logika klaim & proses job (dipakai worker & test)
    worker.js             # entrypoint proses background terpisah
  utils/                  # jwt, response envelope, logger, AppError, asyncHandler
public/dashboard.html      # bonus: dashboard monitoring background job
tests/                     # Jest + Supertest
```

## Catatan keamanan

- PIN di-hash dengan bcrypt, tidak pernah disimpan/di-return dalam bentuk plain text.
- Endpoint yang butuh auth memverifikasi JWT dan memuat ulang user dari DB (bukan cuma percaya
  payload token), supaya user yang sudah dihapus tidak bisa tetap "login".
- `phone_number` sengaja tidak bisa diubah lewat `PUT /profile` karena berfungsi sebagai unique
  key untuk login.
