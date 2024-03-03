/*
    'http://192.168.80.16:3001',
    'http://192.168.80.16:3002',
    'http://192.168.80.16:3003'

*/

require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');

const app = express();

app.use(cors());

const SERVER_IP_1 = process.env.SERVER_IP_1;
const SERVER_IP_2 = process.env.SERVER_IP_2;
const SERVER_IP_3 = process.env.SERVER_IP_3;

console.log('SERVER_IP_1:', SERVER_IP_1);

const servers = [
    SERVER_IP_1,
    SERVER_IP_2,
    SERVER_IP_3
];

let cur = 0;
const ipServerMap = {};

const handler = (req, res) => {
    const clientIp = req.ip;
    let serverUrl;

    if (ipServerMap[clientIp]) {
        serverUrl = ipServerMap[clientIp];
    } else {
        serverUrl = servers[cur];
        ipServerMap[clientIp] = serverUrl;
        cur = (cur + 1) % servers.length;
    }

    const _req = request({url: serverUrl + req.url});
    console.log('redirecting to server', serverUrl);
    console.log('client IP:', clientIp);

    _req.on('error', function(err) {
        console.log(`Error: El servidor en la dirección ${serverUrl} no está disponible.`);
        delete ipServerMap[clientIp];
        handler(req, res);
    });

    req.pipe(_req).pipe(res);
}

const server = app.get('*', handler).post('*', handler);

server.listen(8888);