import WebSocket, { WebSocketServer } from 'ws';
import dgram from 'node:dgram';
import localtunnel from 'localtunnel';
import { createServer } from 'node:http';

const TUNNEL = process.env.TUNNEL;
const HOST = 'https://charts.brianhuyvo.com'
const WS_PORT = process.env.WS_PORT ?? 5000;
const XP_PORT = process.env.XP_PORT ?? 49002;

const server = createServer((req, res) => {
    if (!req.url.includes('V7pMh4xRihflnr61'))
        return res.end();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'image/jpeg');
    const parts = req.url.split('/');
    const max = parts[2] === '301' ? 23 : parts[2] === '302' ? 22 : 20;
    parts[4] = parts[4] === '1' ? max - 2 : (max - parts[4] * 2);
    fetch('https://t.skyvector.com' + parts.join('/'))
        .then(res => res.arrayBuffer())
        .then(data => res.end(Buffer.from(data)))
        .catch(e => {
            console.error(e);
            res.end();
        });
});

const wss = new WebSocketServer({ server });

server.listen(WS_PORT, () => {
    console.log('proxy server started on', WS_PORT);
    if (TUNNEL) {
        localtunnel({ port: WS_PORT })
            .then(tunnel => console.log(`${HOST}?proxy=${tunnel.url}`));
    } else {
        console.log(`${HOST}?proxy=http://localhost:5000`)
    }
});

const socket = dgram.createSocket('udp4');

socket.on('error', (err) => {
    console.error(`server error:\n${err.stack}`);
    socket.close();
});

const xgpsKeys = [
    'longitude', 'latitude', 'elevation',
    'bearing', 'speed'
];

const xattKeys = [
    'yaw', 'pitch', 'roll',
    'p', 'q', 'r',
    'speed_east', 'speed_up', 'speed_south',
    'gload_side', 'gload_normal', 'gload_axial'
];

const xtraKeys = [
    'index', 'latitude', 'longitude', 'elevation',
    'vertical_speed', 'ground', 'heading', 'speed', 'tail_number'
]

const zip = (data, keys) => data.reduce((obj, field, i) => {
    obj[keys[i]] = parseFloat(field);
    return obj;
}, {});

socket.on('message', msg => {
    const header = msg.subarray(0, 4).toString('utf-8');
    const data = msg.subarray(6, -1).toString('utf-8').split(',');
    const payload = { header };
    if (header === 'XGPS') {
        payload.data = zip(data, xgpsKeys);
    } else if (header === 'XATT') {
        payload.data = zip(data, xattKeys);
    } else {
        payload.data = zip(data, xtraKeys);
    }
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    })
});

socket.bind(XP_PORT);