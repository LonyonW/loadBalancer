require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');

const app = express();

app.use(cors());

app.use((req, res, next) => {
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}:${now.getHours()}/${now.getMinutes()}/${now.getSeconds()}`;
    const clientIp = req.ip.split(':').pop();
    console.log(`[${clientIp}] [${formattedDate}]`);
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
        if (err) {
            console.log(`Error: Server refused connection ${serverUrl} is not available.`);
            cur = (cur + 1) % servers.length;
            errorCount++;
            if (errorCount < servers.length) {
                checkServer(req, res, callback);
            } else {
                res.status(500).send('No se pudo conectar a ninguno de los servidores');
                errorCount = 0;
            }
        } else {
            callback(serverUrl);
            cur = (cur + 1) % servers.length; // Move this line here
        }
    });
}

const handler = (req, res) => {
    checkServer(req, res, function(serverUrl) {
        const _req = request({url: serverUrl + req.url});
        console.log('redirecting to', serverUrl);
        req.pipe(_req).pipe(res);
        // cur = (cur + 1) % servers.length; // Remove this line
    });
}

const server = app.get('*', handler).post('*', handler);

server.listen(8888);