const express = require('express');
const router = express.Router();
const { PlaybackHistory, UserPreference } = require('../models/mongoModels');

// =================================================================
// FUNGSI 9: RIWAYAT PEMUTARAN LAGU
// =================================================================
app.post('/api/playback-history', async (req, res) => {
    try {
        // Logika skema: Menggunakan pendekatan 1 dokumen per pemutaran (bukan array embedding besar).
        // Hal ini dirancang karena data log transaksi pemutaran bertambah dengan intensitas tinggi (High-Frequency).
        const logBaru = new PlaybackHistory(req.body);
        await logBaru.save();
        res.status(201).json({ message: "Riwayat pemutaran lagu berhasil dicatat!", data: logBaru });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =================================================================
// FUNGSI 10: REKOMENDASI MUSIK UTAMA
// =================================================================
app.get('/api/users/:userId/recommendations', async (req, res) => {
    try {
        const user_id = parseInt(req.params.userId);

        // Tahap 1: Menarik data genre minat milik user dari koleksi user_preferences
        const preferensiUser = await UserPreference.findOne({ user_id: user_id }, { preferred_genres: 1, _id: 0 });

        if (!preferensiUser || !preferensiUser.preferred_genres) {
            return res.status(200).json({ message: "Belum ada preferensi terdaftar.", recommendations: [] });
        }

        // Tahap 2: Pipeline Agregasi untuk menyaring log riwayat pemutaran global
        const rekomendasi = await PlaybackHistory.aggregate([
            {
                $match: {
                    user_id: { $ne: user_id }, // Collaborative Filtering: Mencari data dari tren dengar user lain
                    genre: { $in: preferensiUser.preferred_genres } // Menyaring agar genrenya sesuai dengan preferensi user aktif
                }
            },
            {
                $group: {
                    _id: {
                        song_id: "$song_id",
                        title: "$song_title",
                        artist_name: "$artist_name",
                        genre: "$genre"
                    },
                    total_play: { $sum: 1 } // Mengakumulasi total pemutaran lagu global sebagai indikator popularitas
                }
            },
            { $sort: { total_play: -1 } }, // Mengurutkan berdasarkan total putar terbanyak
            { $limit: 10 } // Membatasi output sistem rekomendasi sebanyak 10 lagu teratas
        ]);

        res.status(200).json({
            message: "Rekomendasi musik berhasil digenerate melalui pipeline agregasi!",
            preferred_genres: preferensiUser.preferred_genres,
            recommendations: rekomendasi
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =================================================================
// FUNGSI 11: PREFERENSI MUSIK USER
// =================================================================

// --- 11A. Menampilkan Profil Preferensi & Statistik ---
app.get('/api/users/:userId/preferences', async (req, res) => {
    try {
        const user_id = parseInt(req.params.userId);
        const hasil = await UserPreference.findOne({ user_id: user_id }, { _id: 0 });
        if (!hasil) return res.status(404).json({ message: "Preferensi user belum diatur." });
        res.status(200).json({ data: hasil });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 11B. Mengatur / Menyimpan Preferensi Baru ---
app.post('/api/users/preferences', async (req, res) => {
    try {
        const { user_id, preferred_genres, preferred_language, settings, listening_stats } = req.body;
        // Menggunakan findOneAndUpdate dengan opsi { upsert: true }
        // untuk melakukan operasi insert otomatis jika data belum ada, atau update jika sudah ada.
        const hasil = await UserPreference.findOneAndUpdate(
            { user_id: user_id },
            { preferred_genres, preferred_language, settings, listening_stats, updated_at: new Date() },
            { upsert: true, new: true }
        );
        res.status(200).json({ message: "Preferensi musik berhasil diperbarui!", data: hasil });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;