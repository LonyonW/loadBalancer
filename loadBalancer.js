require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');
const expressWs = require('express-ws')(express()); // Initialize express-ws
const WebSocket = require('ws'); // For WebSocket forwarding

const app = express();

app.use(cors());

app.use((req, res, next) => {
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}:${now.getHours()}/${now.getMinutes()}/${now.getSeconds()}`;
    const clientIp = req.ip.split(':').pop(); 
    console.log(`new request from: [${clientIp}] [${formattedDate}]`);
    next();
});

const SERVER_IP_1 = process.env.SERVER_IP_1;
const SERVER_IP_2 = process.env.SERVER_IP_2;
const SERVER_IP_3 = process.env.SERVER_IP_3;

const servers = [
    SERVER_IP_1,
    SERVER_IP_2,
    SERVER_IP_3
];

let cur = 0;
let errorCount = 0;

const checkServer = (req, res, callback) => {
    let serverUrl = servers[cur];
    const _req = request({url: serverUrl, method: 'HEAD'}, function(err) {
        cur = (cur + 1) % servers.length; // Increment cur in each request
        if (err) {
            console.log(`Error: Server refused connection ${serverUrl} is not available.`);
            errorCount++;
            if (errorCount < servers.length) {
                checkServer(req, res, callback);
            } else {
                res.status(500).send('No se pudo conectar a ninguno de los servidores');
                console.log('No server available');
                errorCount = 0;
            }
        } else {
            callback(serverUrl);
            errorCount = 0; // Reset errorCount on success
        }
    });    
}

const handler = (req, res) => {
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        // WebSocket upgrade request 
        expressWs.getWss().handleUpgrade(req, res.socket, Buffer.alloc(0), (ws) => {
            checkServer(req, res, (serverUrl) => {
                const clientWs = ws;  
                const serverWs = new WebSocket(serverUrl); 

                // Forward messages from client to server
                clientWs.on('message', (msg) => serverWs.send(msg));

                // Forward messages from server to client
                serverWs.on('message', (msg) => clientWs.send(msg));

                // Error handling (add more robust error handling here) 
                clientWs.on('error', (err) => console.error('Client WebSocket error:', err));
                serverWs.on('error', (err) => console.error('Server WebSocket error:', err));
            });
        });
    } else {
        // Regular HTTP request
        checkServer(req, res, function(serverUrl) {
            const _req = request({ url: serverUrl + req.url });
            console.log('redirecting to', serverUrl);
            req.pipe(_req).pipe(res);
        });
    }
};

// Support both HTTP and WebSocket requests
app.get('*', handler).post('*', handler).ws('*', handler); 

app.listen(8888); // Start the server (consider using `server.listen`)
