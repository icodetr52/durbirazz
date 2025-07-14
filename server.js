const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = 3000;

// Form verisini alabilmek için:
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// HTML dosyasını göstermek için:
app.use(express.static(path.join(__dirname, 'public/')));


// Formdan gelen POST isteğini yakala
app.post('/register', (req, res) => {
    const { name, email, password, date } = req.body;

    const userData = `İsim: ${name}, Email: ${email}, Şifre: ${password}, Tarih: ${date}\n`;

    fs.appendFile('users.txt', userData, (err) => {
        if (err) {
            console.error('Hata:', err);
            return res.status(500).send('Sunucu hatası!');
        }
        res.send('Kayıt başarılı!');
    });
});

app.post('/login', (req, res) => {
    const { email, password, feeling } = req.body;

    fs.readFile('users.txt', 'utf8', (err, data) => {
        if (err) {
            console.error('Dosya okunamadı:', err);
            return res.status(500).send('Sunucu hatası');
        }

        const lines = data.split('\n').filter(line => line.trim() !== '');
        let found = false;
        let updatedLines = [];

        for (let line of lines) {
            if (line.includes(`Email: ${email}`) && line.includes(`Şifre: ${password}`)) {
                found = true;
                const nameMatch = line.match(/İsim: (.*?), Email:/);
                const name = nameMatch ? nameMatch[1] : "Anonim";

                // Yeni kayıt duygu ile birlikte
                const updatedLine = `İsim: ${name}, Email: ${email}, Şifre: ${password}, Duygu: ${feeling}`;
                updatedLines.push(updatedLine);

                // İsmi ve duygu bilgisini client'a gönder
                res.json({ message: "Giriş başarılı!", name, feeling });
            } else {
                updatedLines.push(line);
            }
        }

        if (!found) {
            return res.status(401).send("Email veya şifre hatalı!");
        }

        fs.writeFile('users.txt', updatedLines.join('\n') + '\n', err => {
            if (err) console.error("Güncelleme hatası:", err);
        });
    });
});

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Dosya depolama ayarları
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });
// Mesaj kaydetme
app.post('/messages', upload.single('photo'), (req, res) => {
    const { name, message, feeling } = req.body;

    const now = new Date();
    const time = now.toLocaleString("tr-TR");

    let photoPath = '';
    if (req.file) {
        photoPath = `/uploads/${req.file.filename}`;
    }
  const formatted = `İsim: ${name} || Duygu: ${feeling} || Mesaj: ${message} || Tarih: ${time}${photoPath ? ` || Foto: ${photoPath}` : ''}\n`;


    fs.appendFile('messages.txt', formatted, err => {
        if (err) {
            console.error("Mesaj kaydedilemedi:", err);
            return res.status(500).send("Sunucu hatası");
        }

        res.send("Mesaj kaydedildi");
    });
});


// Tüm mesajları getir
app.get('/messages', (req, res) => {
    fs.readFile('messages.txt', 'utf8', (err, data) => {
        if (err) {
            console.error("Mesajlar okunamadı:", err);
            return res.status(500).send("Sunucu hatası");
        }

        const messages = data
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                const nameMatch = line.match(/İsim: (.*?) \|\|/);
                const feelingMatch = line.match(/Duygu: (.*?) \|\|/);
                const messageMatch = line.match(/Mesaj: (.*?) \|\|/);
              const dateMatch = line.match(/Tarih: ([^|]+)/);
               const photoMatch = line.match(/Foto: (\/uploads\/[^\s]+)/);

                return {
                    name: nameMatch?.[1] || "Anonim",
                    message: messageMatch?.[1] || "",
                    date: dateMatch?.[1] || "",
                    feeling: feelingMatch?.[1] || "🤔",
                    photo: photoMatch?.[1] || ""
                };

            });

        res.json(messages);
    });
});




// Sunucuyu başlat
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor`);
});
