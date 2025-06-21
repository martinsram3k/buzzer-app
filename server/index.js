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
// V reálné aplikaci byste zde používali skutečnou databázi
// a hesla by byla HASHovaná (např. bcrypt).
const users = [
    { username: 'testuser', password: 'password123' },
    { username: 'admin', password: 'adminpassword' },
];

// Statické soubory
app.use(express.static(path.join(__dirname, 'client-web')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client-web', 'index.html'));
});

// Socket.IO logika
io.on('connection', (socket) => {
    console.log(`Uživatel připojen: ${socket.id}`);

    // Posluchač pro přihlášení (zůstává stejný)
    socket.on('login', ({ username, password }) => {
        console.log(`Pokus o přihlášení uživatele: ${username}`);
        const user = users.find(u => u.username === username);

        if (user) {
            if (user.password === password) { // Zde by bylo bcrypt.compare
                console.log(`Uživatel ${username} se úspěšně přihlásil.`);
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

    // --- Nový posluchač pro registraci ---
    socket.on('register', ({ username, password }) => {
        console.log(`Pokus o registraci uživatele: ${username}`);

        // Server-side validace
        if (!username || !password) {
            socket.emit('registerResponse', { success: false, message: 'Uživatelské jméno a heslo nesmí být prázdné.' });
            return;
        }
        if (password.length < 6) {
            socket.emit('registerResponse', { success: false, message: 'Heslo musí mít alespoň 6 znaků.' });
            return;
        }
        if (username.length < 3) {
            socket.emit('registerResponse', { success: false, message: 'Uživatelské jméno musí mít alespoň 3 znaky.' });
            return;
        }

        // Zkontrolujeme, zda uživatel s tímto jménem již existuje
        const userExists = users.some(u => u.username === username);

        if (userExists) {
            console.log(`Registrace: Uživatelské jméno ${username} již existuje.`);
            socket.emit('registerResponse', { success: false, message: 'Uživatelské jméno již existuje.' });
        } else {
            // V reálné aplikaci byste zde hashovali heslo (bcrypt.hash)
            users.push({ username, password }); // Přidáme nového uživatele do naší simulované databáze
            console.log(`Nový uživatel ${username} úspěšně zaregistrován. Celkový počet uživatelů: ${users.length}`);
            console.log('Aktuální uživatelé:', users); // Pro debug

            socket.emit('registerResponse', { success: true, message: 'Registrace úspěšná!', username });
        }
    });


    socket.on('disconnect', () => {
        console.log(`Uživatel odpojen: ${socket.id}`);
    });

    // Zde můžete přidat další Socket.IO event handlery
});

server.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});