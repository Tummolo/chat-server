// server.js
require('dotenv').config();
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const fetch   = require('node-fetch');    // npm install node-fetch@2
const { Server } = require('socket.io');

const app = express();

// permetti richieste solo dal tuo front-end e dallo stesso server
app.use(cors({
  origin: [
    process.env.ALLOWED_ORIGIN,       // es. https://ios2020.altervista.org
    process.env.ALLOWED_ORIGIN_DEV,   // es. http://localhost:5173
  ],
  credentials: true
}));

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.ALLOWED_ORIGIN,
      process.env.ALLOWED_ORIGIN_DEV
    ],
    credentials: true
  }
});

io.on('connection', socket => {
  console.log(`✔ Client connesso: ${socket.id}`);

  socket.on('join', room => {
    socket.join(room);
    console.log(`→ ${socket.id} entra in ${room}`);
  });

  socket.on('message', async ({ room, user, text, ts }) => {
    // 1) rilancio in realtime
    io.to(room).emit('message', { user, text, ts });

    // 2) salvo la cronologia chiamando il tuo save.php
    try {
      const res = await fetch(
        `${process.env.ALTERVISTA_API_BASE}/chat/save.php`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: room.replace('private-chat-',''),
            sender: user,
            text,
            ts
          })
        }
      );
      const json = await res.json();
      if (!json.ok) console.error('Save.php error:', json);
    } catch(err) {
      console.error('Errore fetch save.php:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`✖ Client disconnesso: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Socket server in ascolto sulla porta ${PORT}`);
});
