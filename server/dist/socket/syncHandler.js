const rooms = new Map();
export function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        const userId = socket.handshake.auth.userId;
        const username = socket.handshake.auth.username;
        console.log(`[Socket] User connected: ${username} (${userId})`);
        socket.on('room:create', ({ name }) => {
            const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const room = {
                id: roomId,
                name,
                hostId: userId,
                currentSong: null,
                isPlaying: false,
                currentTime: 0,
                lastUpdate: Date.now(),
                queue: [],
                listeners: new Map(),
            };
            room.listeners.set(userId, { id: userId, username });
            rooms.set(roomId, room);
            socket.join(`room:${roomId}`);
            socket.emit('room:updated', serializeRoom(room));
            broadcastRoomList(io);
        });
        socket.on('room:join', ({ roomId }) => {
            const room = rooms.get(roomId);
            if (!room) {
                socket.emit('error', 'Oda bulunamadı');
                return;
            }
            room.listeners.set(userId, { id: userId, username });
            socket.join(`room:${roomId}`);
            io.to(`room:${roomId}`).emit('room:updated', serializeRoom(room));
            broadcastRoomList(io);
        });
        socket.on('room:leave', () => {
            leaveCurrentRoom(socket, io, userId);
        });
        socket.on('room:play', ({ song }) => {
            const room = findRoomBySocket(socket);
            if (!room || room.hostId !== userId)
                return;
            room.currentSong = song;
            room.isPlaying = true;
            room.currentTime = 0;
            room.lastUpdate = Date.now();
            io.to(`room:${room.id}`).emit('room:updated', serializeRoom(room));
        });
        socket.on('room:pause', () => {
            const room = findRoomBySocket(socket);
            if (!room || room.hostId !== userId)
                return;
            room.isPlaying = false;
            room.lastUpdate = Date.now();
            io.to(`room:${room.id}`).emit('room:updated', serializeRoom(room));
        });
        socket.on('room:resume', () => {
            const room = findRoomBySocket(socket);
            if (!room || room.hostId !== userId)
                return;
            room.isPlaying = true;
            room.lastUpdate = Date.now();
            io.to(`room:${room.id}`).emit('room:updated', serializeRoom(room));
        });
        socket.on('room:seek', ({ time }) => {
            const room = findRoomBySocket(socket);
            if (!room || room.hostId !== userId)
                return;
            room.currentTime = time;
            room.lastUpdate = Date.now();
            io.to(`room:${room.id}`).emit('room:updated', serializeRoom(room));
        });
        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${username} (${userId})`);
            leaveCurrentRoom(socket, io, userId);
        });
    });
    setInterval(() => {
        for (const [, room] of rooms) {
            if (room.isPlaying && room.listeners.size > 1) {
                const elapsed = (Date.now() - room.lastUpdate) / 1000;
                const syncTime = room.currentTime + elapsed;
                for (const [listenerId] of room.listeners) {
                    const sockets = io.sockets.adapter.rooms.get(`room:${room.id}`);
                    if (sockets) {
                        io.to(`room:${room.id}`).emit('room:sync', {
                            current_time: syncTime,
                            is_playing: true,
                        });
                    }
                }
            }
        }
    }, 3000);
}
function findRoomBySocket(socket) {
    for (const [, room] of rooms) {
        if (room.listeners.has(socket.handshake.auth.userId)) {
            return room;
        }
    }
    return undefined;
}
function leaveCurrentRoom(socket, io, userId) {
    for (const [roomId, room] of rooms) {
        if (room.listeners.has(userId)) {
            room.listeners.delete(userId);
            if (room.listeners.size === 0) {
                rooms.delete(roomId);
                io.to(`room:${roomId}`).emit('room:closed');
            }
            else {
                if (room.hostId === userId && room.listeners.size > 0) {
                    room.hostId = Array.from(room.listeners.keys())[0];
                }
                socket.leave(`room:${roomId}`);
                io.to(`room:${roomId}`).emit('room:updated', serializeRoom(room));
            }
            broadcastRoomList(io);
            break;
        }
    }
}
function serializeRoom(room) {
    return {
        id: room.id,
        name: room.name,
        host_id: room.hostId,
        current_song: room.currentSong,
        is_playing: room.isPlaying,
        current_time: room.currentTime,
        queue: room.queue,
        listeners: Array.from(room.listeners.values()),
        created_at: new Date().toISOString(),
    };
}
function broadcastRoomList(io) {
    const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
        id,
        name: room.name,
        listenerCount: room.listeners.size,
    }));
    io.emit('rooms:list', roomList);
}
