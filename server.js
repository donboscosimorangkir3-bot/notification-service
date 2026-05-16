// notification-service/server.js
const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();
app.use(express.json());

// ─── DATABASE CONNECTION ───────────────────────────────────────────────────────
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal konek ke db_otp_service:', err.message);
    } else {
        console.log('✅ Terhubung ke Database db_otp_service (Microservice DB)');
    }
});

// ─── NODEMAILER TRANSPORTER ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }
});

// ─── ROUTE: SEND OTP ──────────────────────────────────────────────────────────
app.post('/api/send-otp', (req, res) => {
    const { email, otp, type } = req.body;

    const subjectEmail = type === 'forgot'
        ? 'Kode OTP Lupa Password Kopitiam'
        : 'Kode OTP Registrasi Kopitiam';

    const mailOptions = {
    from: `"Kopitiam App" <${process.env.MAIL_FROM}>`,
    to: email,
    subject: subjectEmail,
    html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            
            <!-- HEADER -->
            <div style="background-color: #6F4E37; padding: 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0;">☕ Kopitiam33</h2>
            </div>

            <!-- BODY -->
            <div style="padding: 30px; background-color: #ffffff;">
                <p style="font-size: 15px; color: #333;">Halo! 👋</p>
                <p style="font-size: 14px; color: #555; line-height: 1.6;">
                    Berikut adalah kode OTP Anda untuk proses 
                    <b>${type === 'forgot' ? 'lupa password' : 'registrasi akun'}</b>.
                    Kode berlaku selama <b>5 menit</b> dan jangan berikan kepada siapapun.
                </p>

                <!-- OTP BOX -->
                <div style="background-color: #FFF8F0; border: 2px dashed #d35400; border-radius: 8px; text-align: center; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Kode OTP</p>
                    <h1 style="margin: 0; font-size: 42px; color: #d35400; letter-spacing: 8px;">${otp}</h1>
                </div>

                <p style="font-size: 13px; color: #888; margin: 0;">
                    Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.
                </p>
            </div>

            <!-- FOOTER -->
            <div style="background-color: #f9f9f9; padding: 15px 30px; border-top: 1px solid #e0e0e0; text-align: center;">
                <p style="font-size: 12px; color: #bbb; margin: 0;">© ${new Date().getFullYear()} Kopitiam33. All rights reserved.</p>
            </div>

        </div>
    `
};

    transporter.sendMail(mailOptions, async (error, info) => {
        const status = error ? 'failed' : 'success';

        if (error) {
            console.error('❌ Gagal kirim email:', error.message);
        } else {
            console.log('✅ OTP terkirim ke:', email);
        }

        // Hash OTP sebelum disimpan ke database (hanya jika berhasil terkirim)
        let logOtp = otp;
        if (status === 'success') {
            try {
                const salt = await bcrypt.genSalt(10);
                logOtp = await bcrypt.hash(String(otp), salt);
            } catch (hashErr) {
                console.error('❌ Gagal hash OTP:', hashErr.message);
            }
        }

        // Simpan log ke database
        const query = 'INSERT INTO otp_logs (email, otp_code, type, status) VALUES (?, ?, ?, ?)';
        db.query(query, [email, logOtp, type, status], (dbErr) => {
            if (dbErr) {
                console.error('❌ Gagal simpan log ke DB:', dbErr.message);
            } else {
                console.log(`✅ Log OTP (${type}) tersimpan di db_otp_service untuk: ${email}`);
            }
        });

        if (status === 'success') {
            res.json({ status: 'success', message: 'OTP terkirim lewat Microservice' });
        } else {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(process.env.PORT || 8001, () => {
    console.log(`✅ Microservice OTP aktif di port ${process.env.PORT || 8001}`);
});