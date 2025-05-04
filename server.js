// server.js
require('dotenv').config();
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const fetch   = require('node-fetch');    // npm install node-fetch@2
const { Server } = require('socket.io');

const {
  ALLOWED_ORIGIN,
  ALLOWED_ORIGIN_DEV,
  ALTERVISTA_API_BASE
} = process.env;

const app = express();

// 1) CORS per il front-end
app.use(cors({
  origin: [ALLOWED_ORIGIN, ALLOWED_ORIGIN_DEV],
  credentials: true
}));

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [ALLOWED_ORIGIN, ALLOWED_ORIGIN_DEV],
    credentials: true
  }
});

io.on('connection', socket => {
  console.log(`✔ Client connesso: ${socket.id}`);

  // join alle stanze
  socket.on('join', room => {
    socket.join(room);
    console.log(`→ ${socket.id} entra in ${room}`);
  });

  // messaggio in arrivo dal client
  socket.on('message', async ({ room, user, text, ts }) => {
    // 1) rilancio in realtime, includendo 'room'
    socket.to(room).emit('message', { user, text, ts });

    // 2) salvo lo storico chiamando save.php su Altervista
    const userId = room.replace(/^private-chat-/, '');
    try {
      const res = await fetch(
        `${ALTERVISTA_API_BASE}/chat/save.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            sender:  user,
            text,
            ts
          })
        }
      );
      const json = await res.json();
      if (!json.ok) {
        console.error('save.php non OK:', json);
      }
    } catch (err) {
      console.error('Errore chiamata save.php:', err);
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
