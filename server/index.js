// index.js (tvůj backend soubor)

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Zde definujeme simulovanou databázi uživatelů
// V reálné aplikaci byste zde používali skutečnou databázi (MongoDB, PostgreSQL atd.)
// a hesla by byla HASHovaná (např. bcrypt).
const users = [
    { username: 'testuser', password: 'password123' },
    { username: 'admin', password: 'adminpassword' },
    // Přidejte další uživatele pro testování
];

// Statické soubory
app.use(express.static(path.join(__dirname, 'client-web')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client-web', 'index.html'));
});

// Socket.IO logika
io.on('connection', (socket) => {
    console.log(`Uživatel připojen: ${socket.id}`);

    // --- Nový posluchač pro přihlášení ---
    socket.on('login', ({ username, password }) => {
        console.log(`Pokus o přihlášení uživatele: ${username}`);

        // Najdeme uživatele v naší simulované databázi
        const user = users.find(u => u.username === username);

        if (user) {
            // V reálné aplikaci byste zde porovnávali hashované heslo (bcrypt.compare)
            if (user.password === password) {
                console.log(`Uživatel ${username} se úspěšně přihlásil.`);
                // Pošleme klientovi zprávu o úspěchu
                socket.emit('loginResponse', { success: true, message: 'Přihlášení úspěšné!', username: user.username });
            } else {
                console.log(`Uživatel ${username}: Špatné heslo.`);
                socket.emit('loginResponse', { success: false, message: 'Špatné uživatelské jméno nebo heslo.' });
            }
        } else {
            console.log(`Uživatel ${username} nenalezen.`);
            socket.emit('loginResponse', { success: false, message: 'Špatné uživatelské jméno nebo heslo.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Uživatel odpojen: ${socket.id}`);
    });

    // Zde můžete přidat další Socket.IO event handlery pro hru atd.
});

server.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});