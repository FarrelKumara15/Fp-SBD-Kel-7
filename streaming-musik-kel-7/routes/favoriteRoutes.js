const express = require('express');
const router = express.Router();
const { Favorite } = require('../models/mongoModels');

module.exports = (mysqlConnection) => {

// =================================================================
// FUNGSI 7: TAMBAH/HAPUS FAVORIT LAGU
// =================================================================

// --- 7A. Menambahkan Lagu ke Favorit (Dengan Pengecekan Validitas ID ke MySQL) ---
app.post('/api/favorites', async (req, res) => {
    try {
        const { user_id, song_id } = req.body;

        if (!user_id || !song_id) {
            return res.status(400).json({ message: "Gagal! user_id dan song_id wajib diisi." });
        }

        // TAHAP 1: Mampir ke MySQL dulu untuk memastikan song_id beneran ada di katalog lagu kelompok 7
        // Kita gunakan JOIN ke tabel artists sekaligus untuk menarik data nama musisi secara otomatis
        const cekMySQLQuery = `
            SELECT songs.title, songs.artist_id, songs.genre, songs.duration, artists.artist_name 
            FROM songs 
            JOIN artists ON songs.artist_id = artists.artist_id 
            WHERE songs.song_id = ?
        `;

        mysqlConnection.query(cekMySQLQuery, [song_id], async (err, mysqlResults) => {
            if (err) {
                return res.status(500).json({ message: "Error saat verifikasi ke database MySQL", error: err.message });
            }

            // Jika lagu tidak ditemukan di tabel MySQL (panjang array hasil = 0)
            if (mysqlResults.length === 0) {
                return res.status(404).json({ 
                    message: `Gagal menambah favorit! Lagu dengan ID ${song_id} tidak valid atau tidak terdaftar di MySQL.` 
                });
            }

            // Ambil semua data atribut lagu yang asli langsung dari baris database MySQL
            const title = mysqlResults[0].title;
            const artist_id = mysqlResults[0].artist_id;
            const artist_name = mysqlResults[0].artist_name;
            const genre = mysqlResults[0].genre;
            const duration = mysqlResults[0].duration;

            // TAHAP 2: Jika lolos validasi MySQL, baru lakukan operasi embedding data ke MongoDB
            const hasilMongo = await Favorite.findOneAndUpdate(
                { user_id: user_id, "songs.song_id": { $ne: song_id } },
                {
                    $push: {
                        songs: { song_id, title, artist_id, artist_name, genre, duration, added_at: new Date() }
                    },
                    $inc: { total_favorites: 1 },
                    $set: { updated_at: new Date() }
                },
                { upsert: true, new: true }
            );

            if (!hasilMongo) {
                return res.status(400).json({ message: "Lagu ini sudah ada di dalam daftar favorit user!" });
            }

            res.status(200).json({ 
                message: `Berhasil! Lagu '${title}' - ${artist_name} tervalidasi di MySQL dan sukses disimpan ke favorit MongoDB.`, 
                data: hasilMongo 
            });
        });

    } catch (err) {
        res.status(500).json({ message: "Error internal server", error: err.message });
    }
});

// --- 7B. Menghapus Lagu dari Favorit ($pull) ---
app.delete('/api/favorites', async (req, res) => {
    try {
        const { user_id, song_id } = req.body;

        // Logika query: Mencari dokumen berdasarkan user_id dan memastikan song_id tersebut eksis di dalam array.
        const hasil = await Favorite.findOneAndUpdate(
            { user_id: user_id, "songs.song_id": song_id },
            {
                $pull: { songs: { song_id: song_id } }, // Mengeluarkan objek lagu dari array songs
                $inc: { total_favorites: -1 }, // Mengurangi counter total favorit
                $set: { updated_at: new Date() }
            },
            { new: true }
        );

        if (!hasil) return res.status(404).json({ message: "Data tidak ditemukan atau lagu memang tidak ada di favorit." });
        res.status(200).json({ message: "Lagu berhasil dihapus dari favorit!", data: hasil });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7C. Menampilkan Semua Lagu Favorit User ---
app.get('/api/users/:userId/favorites', async (req, res) => {
    try {
        const user_id = req.params.userId;
        // Proyeksi { songs: 1, total_favorites: 1, _id: 0 } digunakan untuk menghemat bandwidth
        // dengan hanya mengambil properti array songs tanpa mengikutkan properti _id bawaan Mongo.
        const hasil = await Favorite.findOne({ user_id: user_id }, { songs: 1, total_favorites: 1, _id: 0 });
        res.status(200).json({ data: hasil || { songs: [], total_favorites: 0 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

 return router;
 
};