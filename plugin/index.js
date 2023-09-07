import { WebSocketServer } from 'ws';
import dgram from 'node:dgram';
import localtunnel from 'localtunnel';
import { createServer } from 'node:http';

const TUNNEL = process.env.TUNNEL;
const HOST = 'https://charts.brianhuyvo.com'
const WS_PORT = process.env.WS_PORT ?? 5000;
const XP_PORT = process.env.XP_PORT ?? 49000;
const XP_ADDR = process.env.XP_ADDR ?? '172.25.192.1';
const BIND_PORT = process.env.BIND_PORT ?? 50000;

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
            .then(async tunnel => {
                const res = await fetch(tunnel.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
                    }
                });
                if (res.status === 511) {
                    const text = await res.text();
                    const tokenMatch = text.match(/(?<=url: "\/continue\/).+(?=",)/);
                    if (tokenMatch) {
                        const token = JSON.parse(Buffer.from(tokenMatch[0].split('.')[1], 'base64'));                        
                        const { success } = await fetch(`${tunnel.url}/continue/${tokenMatch[0]}`, {
                            method: 'POST',
                            body: new URLSearchParams({
                                endpoint: token.endpointIp
                            }),
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
                            }
                        }).then(res => res.json());
                        
                        if (success) {
                            console.log(`${HOST}?proxy=${tunnel.url}`);
                        } else {
                            console.log('failed to start tunnel');
                            process.exit(1);
                        }
                    }
                } else {
                    console.log(`${HOST}?proxy=${tunnel.url}`);
                }
            });
    } else {
        console.log(`${HOST}?proxy=http://localhost:5000`);
    }
});

const socket = dgram.createSocket('udp4');

socket.on('error', (err) => {
    console.error(`server error:\n${err.stack}`);
    socket.close();
});

const broadcast = msg => wss.clients.forEach(client => client.send(JSON.stringify(msg)));

// m to ft -  x / 0.3048
// m/s to kts - x / 1852 * 3600

socket.on('message', msg => {
    const type = msg.subarray(0, 4).toString('utf-8');
    switch (type) {
        case 'RPOS':
            const vx = msg.readFloatLE(45),
                  vz = msg.readFloatLE(53);
            const data = {
                longitude: msg.readDoubleLE(5),
                latitude: msg.readDoubleLE(13),
                altitudeMSL: msg.readDoubleLE(21),
                altitudeAGL: msg.readFloatLE(29),
                pitch: msg.readFloatLE(33),
                yaw: msg.readFloatLE(37),
                roll: msg.readFloatLE(41),
                speed: Math.round(Math.sqrt(vx * vx + vz * vz)),
                vx,
                vy: msg.readFloatLE(49),
                vz,
                p: msg.readFloatLE(57),
                q: msg.readFloatLE(61),
                r: msg.readFloatLE(65),
            }
            console.log(data)
            broadcast({
                type: 'position',
                data
            });
            break;
        case 'RADR':
            broadcast({
                type: 'radar',
                data: {
                    longitude: msg.readFloatLE(5),
                    latitude: msg.readFloatLE(9),
                    bases: msg.readFloatLE(13),
                    tops: msg.readFloatLE(17),
                    clouds: msg.readFloatLE(21),
                    precip: msg.readFloatLE(25)
                }
            });
            break;
        default:
            console.log(msg);
    }
});

socket.bind(BIND_PORT);

socket.on('listening', () => {
    socket.send('RPOS\x001\x00', XP_PORT, XP_ADDR);
    socket.send('RADR\x000\x00', XP_PORT, XP_ADDR);
});

// wss.on('connection', ws => {
//     ws.on('message', data => {
//         try {
//             const payload = JSON.parse(data.toString('utf-8'));
//             if (!payload.type)
//                 throw new Error();

//             switch (payload.type) {
//                 case 'position':
//                     socket.send('RPOS\x001\x00', XP_PORT, XP_ADDR);
//                     break;
//                 case 'radar':
//                     socket.send('RADR\x001\x00', XP_PORT, XP_ADDR);
//                     break;
//                 case 'stop':
//                     socket.send('RPOS\x000\x00', XP_PORT, XP_ADDR);
//                     socket.send('RADR\x000\x00', XP_PORT, XP_ADDR);
//                     break;
//                 default:
//                     console.log(payload);
//             }
//         } catch(e) {
//             console.log(e)
//             console.log(data.toString('utf-8'))
//         }
//     });
// })