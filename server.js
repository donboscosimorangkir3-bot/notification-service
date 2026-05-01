// notification-service/server.js
const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(express.json());

// KONFIGURASI SMTP SESUAI DATA ANDA
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587, // Anda bisa pakai 587 atau 2525 (sesuai env Anda)
    auth: {
        user: "a85540001@smtp-brevo.com", // Login dari gambar Brevo
        pass: "xsmtpsib-c4a22f5b67f4e7e58fb94ec41e7a00bce317fbd5cc50321436f15fc50fa9f570-xZCo8671ii7YSUWx" // Password/Key dari env Anda
    }
});

app.post('/api/send-otp', (req, res) => {
    const { email, otp, type } = req.body;

    // Tentukan Judul Email berdasarkan tipe
    let subjectEmail = 'Kode OTP Registrasi Kopitiam';
    if (type === 'forgot') {
        subjectEmail = 'Kode OTP Lupa Password Kopitiam';
    }

    const mailOptions = {
        from: '"Kopitiam App" <donboscosimorangkir3@gmail.com>', 
        to: email,
        subject: 'Kode OTP Verifikasi Kopitiam',
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd;">
                <h2>Verifikasi Kode OTP</h2>
                <p>Halo, gunakan kode di bawah ini untuk masuk ke aplikasi <b>Kopitiam</b>:</p>
                <h1 style="color: #d35400;">${otp}</h1>
                <p>Jangan berikan kode ini kepada siapa pun.</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Detail Error:", error);
            return res.status(500).json({ status: 'error', message: error.message });
        }
        console.log("✅ Berhasil! OTP terkirim ke: " + email);
        res.json({ status: 'success', message: 'OTP terkirim lewat Microservice' });
    });
});

app.listen(8001, () => {
    console.log("✅ Microservice Kopitiam aktif di port 8001");
});