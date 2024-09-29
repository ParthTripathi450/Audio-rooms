import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 }); // Use a different port

let drawingHistory = []; // This will store the drawing history

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send existing drawing history to the new client
    ws.send(JSON.stringify({ type: 'history', data: drawingHistory }));

    ws.on('message', (message) => {
        console.log('Received message:', message);

        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.error('Error parsing message:', e);
            return;
        }

        if (data.type === 'draw') {
            // Add new drawing data to the history
            drawingHistory.push(data.data);
            // Broadcast drawing data to all clients
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.log('WebSocket error:', error);
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
