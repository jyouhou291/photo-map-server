const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 基本設定
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// フォルダ作成
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('public')) fs.mkdirSync('public');

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
let photos = [];
let connectedUsers = 0;

// Socket.IO処理
io.on('connection', (socket) => {
    connectedUsers++;
    console.log(`✅ ユーザーが接続: ${connectedUsers}人`);
    socket.emit('initial-photos', photos);
    io.emit('user-count', connectedUsers);

    socket.on('photo-add', (photoData) => {
        photos.push(photoData);
        socket.broadcast.emit('photo-added', photoData);
    });

    socket.on('disconnect', () => {
        connectedUsers--;
        io.emit('user-count', connectedUsers);
    });
});

// アップロードエンドポイント
app.post('/upload', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'ファイルなし' });
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// サーバー起動
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🌟 サーバー起動: http://localhost:${PORT}`);
});
