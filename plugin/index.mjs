import WebSocket, { WebSocketServer } from 'ws';
import dgram from 'node:dgram';
import localtunnel from 'localtunnel';

const HOST = process.env.NODE_ENV === 'production'
    ? (process.env.HOST ?? '???')
    : 'http://localhost:3000';
const WS_PORT = process.env.WS_PORT ?? 5000;
const XP_PORT = process.env.XP_PORT ?? 49002;

const wss = new WebSocketServer({ port: WS_PORT });

localtunnel({ port: WS_PORT })
    .then(tunnel => console.log(`${HOST}?wsUrl=${tunnel.url.replace('https://', '')}`));

const server = dgram.createSocket('udp4');

server.on('error', (err) => {
    console.error(`server error:\n${err.stack}`);
    server.close();
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

server.on('message', msg => {
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
    // console.log(payload)
});

server.bind(XP_PORT);