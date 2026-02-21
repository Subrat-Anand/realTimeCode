import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const rooms = new Map();

io.on('connection', (socket) => {

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, username }) => {
    if(currentRoom){
        socket.leave(currentRoom);
        rooms.get(currentRoom).delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
    }

    currentRoom = roomId;
    currentUser = username;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }

    rooms.get(roomId).add(username);

    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
  });
  
  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("leave", () => {
    if(currentRoom && currentUser){
        rooms.get(currentRoom).delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
    }

    socket.leave(currentRoom);

    currentRoom = null;
    currentUser = null;

  });

  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("userTyping", username);
  });

  // 🔥 TYPING STOP
  socket.on("stopTyping", ({ roomId }) => {
    socket.to(roomId).emit("userStopTyping");
  });

  socket.on("languageChange", ({ roomId, language }) => {
    console.log("language changed to ", language)
    io.to(roomId).emit("languageUpdate", language);
  });

  socket.on("disconnect", () => {
    if(currentRoom && currentUser){
        rooms.get(currentRoom).delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
    }
  });
})

const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, '/client/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
