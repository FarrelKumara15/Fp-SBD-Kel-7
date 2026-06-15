const express = require('express');
const mysql = require('mysql2');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// =================================================================
// 1. KONEKSI KE MYSQL (Katalog Utama)
// =================================================================
// Catatan: Ganti 'password_kamu' dengan password MySQL di laptopmu jika ada
const mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'sbd_streaming_musik'
});

mysqlConnection.connect((err) => {
    if (err) {
        console.error('❌ Koneksi MySQL Gagal: ' + err.message);
        return;
    }
    console.log('✅ Berhasil terhubung ke MySQL (Data Terstruktur)');
});

mongoose.connect('mongodb://localhost:27017/sbd_streaming_nosql')
    .then(() => console.log('✅ Berhasil terhubung ke MongoDB (Data Dinamis)'))
    .catch((err) => console.error('❌ Koneksi MongoDB Gagal:', err.message));

// =================================================================
// 2. DELEGASI JALUR UTAMA (MODULAR ROUTING INJECTION)
// =================================================================

// Mengimpor file rute dengan mengumpankan pipa koneksi MySQL untuk enkapsulasi kueri
const authRoutes = require('./streaming-musik-kel-7/routes/authRoutes')(mysqlConnection);
const catalogRoutes = require('./streaming-musik-kel-7/routes/catalogRoutes')(mysqlConnection);
const playlistRoutes = require('./streaming-musik-kel-7/routes/playlistRoutes')(mysqlConnection);
const favoriteRoutes = require('./streaming-musik-kel-7/routes/favoriteRoutes')(mysqlConnection);
const followRoutes = require('./streaming-musik-kel-7/routes/followRoutes')(mysqlConnection);
const interactionRoutes = require('./streaming-musik-kel-7/routes/interactionRoutes');

// Daftarkan base-URL endpoint ke middleware Express
app.use('/api/auth', authRoutes);         // Fungsi 1 (Register & Login)
app.use('/api/catalog', catalogRoutes);   // Fungsi 2 s/d 4 (CRUD & Pencarian)
app.use('/api/playlist', playlistRoutes); // Fungsi 5 dan 6 (Playlist)
app.use('/api/favorites', favoriteRoutes); // Fungsi 7 (Tambah/Hapus Favorit)
app.use('/api/artists', followRoutes);     // Fungsi 8 (Follow/Unfollow Artist)
app.use('/api/interactions', interactionRoutes); // Fungsi 9 s/d 11 (History, Rekomendasi, Preferensi)


// =================================================================
// MENYALAKAN SERVER
// =================================================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});

// =================================================================
// 🖥️ 3. INTERACTIVE TERMINAL TESTING MENU (Readline Engine)
// =================================================================
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Fungsi pembantu untuk menembak API lokal secara otomatis via HTTP Internal
function jalankanTembakAPI(endpoint, method, payload = null) {
    const dataString = payload ? JSON.stringify(payload) : '';
    
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: endpoint,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString)
        }
    };

    console.log(`\n⏳ Mengirim Request: ${method} http://localhost:${PORT}${endpoint}...`);

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log(`\n=================== RESPONSE TERMINAL ===================`);
            console.log(`Status Code: ${res.statusCode}`);
            try {
                console.log(JSON.stringify(JSON.parse(body), null, 2));
            } catch (e) {
                console.log(body);
            }
            console.log(`=========================================================\n`);
            
            rl.question('Tekan [ENTER] untuk kembali ke Menu Utama...', () => {
                tampilkanMenuUtama();
            });
        });
    });

    req.on('error', (err) => {
        console.error(`❌ Request Error: ${err.message}`);
        tampilkanMenuUtama();
    });

    if (payload && method !== 'GET') {
        req.write(dataString);
    }
    req.end();
}

function tampilkanMenuUtama() {
    console.clear();
    console.log(`===========================================================`);
    console.log(`🎵 MASTER BACKEND INTEGRATION TESTING MENU - KELOMPOK 7 🎵`);
    console.log(`===========================================================`);
    console.log(`[1]  Fungsi 1A: Register User Baru (MySQL)`);
    console.log(`[2]  Fungsi 1B: Login User (MySQL)`);
    console.log(`[3]  Fungsi 2A: Tambah Artist Baru (MySQL - Anti Duplikat)`);
    console.log(`[4]  Fungsi 3A: Tambah Lagu Baru (MySQL - Anti Duplikat)`);
    console.log(`[5]  Fungsi 4 : Cari Lagu Berdasarkan Judul (MySQL)`);
    console.log(`[6]  Fungsi 5 : Buat Playlist Baru (MySQL)`);
    console.log(`[7]  Fungsi 6 : Tambah Lagu ke Playlist (MySQL)`);
    console.log(`[8]  Fungsi 11: Simpan Preferensi Musik User 1 (MongoDB)`);
    console.log(`[9]  Fungsi 7A: Tambah Lagu ke Favorit (Cross-Database Validation)`);
    console.log(`[10] Fungsi 8A: Follow Artist Induk (Cross-Database Validation)`);
    console.log(`[11] Fungsi 9 : Catat Riwayat Pemutaran User 2 (Log Global)`);
    console.log(`[12] Fungsi 10: Ambil Rekomendasi Musik User 1 (Aggregation Pipeline)`);
    console.log(`[0]  Keluar dari Aplikasi`);
    console.log(`===========================================================`);
    
    rl.question('Masukkan nomor fungsi yang ingin diuji (0-12): ', (pilihan) => {
        switch (pilihan.trim()) {
            case '1': // Register
                jalankanTembakAPI('/api/auth/register', 'POST', { username: 'Farrel', email: 'farrel@its.ac.id', password: 'password123' });
                break;
            case '2': // Login
                jalankanTembakAPI('/api/auth/login', 'POST', { email: 'farrel@its.ac.id', password: 'password123' });
                break;
            case '3': // Tambah Artist
                jalankanTembakAPI('/api/catalog/artists', 'POST', { artist_name: 'YOASOBI', country: 'Japan', debut_year: 2019, description: 'J-Pop Duo' });
                break;
            case '4': // Tambah Lagu
                jalankanTembakAPI('/api/catalog/songs', 'POST', { artist_id: 1, title: 'Idol', genre: 'J-Pop', duration: 213, release_date: '2023-04-12', audio_url: 'http://storage.com/idol.mp3' });
                break;
            case '5': // Cari Lagu
                jalankanTembakAPI('/api/catalog/songs/search?judul=Idol', 'GET');
                break;
            case '6': // Buat Playlist (Diarahkan ke /api/playlists)
                jalankanTembakAPI('/api/playlists', 'POST', { user_id: 1, playlist_name: 'Wibu Hits', description: 'Koleksi Lagu Jepang Terbaik' });
                break;
            case '7': // Tambah ke Playlist (Diarahkan ke /api/playlists/add-song)
                jalankanTembakAPI('/api/playlists/add-song', 'POST', { playlist_id: 1, song_id: 1 });
                break;
            case '8': // Set Preferensi
                jalankanTembakAPI('/api/users/preferences', 'POST', { user_id: 1, preferred_genres: ['J-Pop', 'Rock'], preferred_language: 'Japanese' });
                break;
            case '9': // Tambah Favorit
                jalankanTembakAPI('/api/favorites', 'POST', { user_id: 1, song_id: 1 });
                break;
            case '10': // Follow Artist
                jalankanTembakAPI('/api/artists/follow', 'POST', { user_id: 1, artist_id: 1 });
                break;
            case '11': // Playback History User 2
                jalankanTembakAPI('/api/playback-history', 'POST', { user_id: 2, song_id: 1, song_title: 'Idol', artist_id: 1, artist_name: 'YOASOBI', genre: 'J-Pop', duration: 213, listened_duration: 213, completed: true });
                break;
            case '12': // Rekomendasi
                jalankanTembakAPI('/api/users/1/recommendations', 'GET');
                break;
            case '0':
                console.log('Terima kasih! Menutup sesi pengujian Terminal Kelompok 7...');
                rl.close();
                process.exit(0);
            default:
                console.log('⚠️ Pilihan tidak valid! Silakan masukkan angka 0 sampai 12.');
                setTimeout(tampilkanMenuUtama, 1500);
                break;
        }
    });
}