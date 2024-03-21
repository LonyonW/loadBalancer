require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');
const expressWs = require('express-ws')(express()); 
const WebSocket = require('ws'); 

const app = express();

app.use(cors());
app.use(express.json()); 

app.use((req, res, next) => {
    const now = new Date();
    const formattedDate = `<span class="math-inline">\{now\.getDate\(\)\}/</span>{now.getMonth()+1}/<span class="math-inline">\{now\.getFullYear\(\)\}\:</span>{now.getHours()}/<span class="math-inline">\{now\.getMinutes\(\)\}/</span>{now.getSeconds()}`;
    const clientIp = req.ip.split(':').pop(); 
    console.log(`new request from: [<span class="math-inline">\{clientIp\}\] \[</span>{formattedDate}]`);
    next();
});

// Lista de servidores registrados
let servers = [];

// Función para verificar la disponibilidad del servidor
const checkServer = (serverUrl, callback) => {
    request({url: serverUrl, method: 'HEAD'}, function(err) {
    if (err) {
        console.log(`Error: Server refused connection ${serverUrl} is not available.`);
        callback(false);
    } else {
        callback(true);
    }
    });
};



app.post('*', (req, res) => {
    if (req.is('application/json')) { 
        const { ip, puerto } = req.body;
        if (ip && puerto) {
            const serverUrl = `http://<span class="math-inline">\{ip\}\:</span>{puerto}`;
            checkServer(serverUrl, (available) => {
                if (available) {
                    servers.push(serverUrl);
                    console.log(`New server registered: IP - ${ip}, Port - ${puerto}`);
                    res.status(200).send('Server registration successful');
                } else {
                    res.status(400).send('Server is not available');
                }
            });
        } else {
            res.status(400).send('Missing ip or puerto in request');
        }
    } else if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') { 
        // Manejo de WebSockets
        // ... 
    } else {
         // Manejo de peticiones HTTP regulares
        // ...
    }
});

const balancer = (req, res) => {
    let serverUrl;
    do {
        serverUrl = servers[Math.floor(Math.random() * servers.length)];
    } while (!serverUrl);
    console.log('redirecting to', serverUrl);
    const _req = request({ url: serverUrl + req.url });
    req.pipe(_req).pipe(res);
};

app.get('*', balancer);

// Manejo de WebSockets
app.ws('*', (ws, req) => {
    balancer(req, {
        end: (data) => {
            ws.send(data);
        },
        onHeaders: (headers, statusLine) => {
            ws.upgradeReq.headers = headers;
            ws.upgradeReq.statusLine = statusLine;
        }
    });
});

app.listen(8888); 

