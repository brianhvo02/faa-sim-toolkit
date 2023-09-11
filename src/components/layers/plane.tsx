import { useEffect, useState } from 'react';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import { useSearchParams } from 'react-router-dom';
import { isPositionData, type PositionData, type SimPayload } from '../data/sim';

export const usePlaneLayer = () => {
    const [params] = useSearchParams();
    const [planeData, setPlaneData] = useState<PositionData>();

    useEffect(() => {
        const proxyUrl = params.get('proxy');
        if (proxyUrl) {
            const ws = new WebSocket(`${proxyUrl.replace('http', 'ws')}`);
            ws.onmessage = e => {
                const payload: SimPayload = JSON.parse(e.data);
                if (isPositionData(payload)) {
                    setPlaneData(payload.data);
                }
            }
    
            return () => ws.close();
        }
    }, [params]);

    const planeLayer = new ScenegraphLayer({
        id: 'plane-layer',
        data: planeData && [planeData],
        scenegraph: './airplane.glb',
        getPosition: (pos: PositionData) => [pos.longitude, pos.latitude, pos.altitudeMSL],
        getOrientation: (pos: PositionData) => [pos.roll, -pos.yaw, 90 + pos.pitch],
        sizeMinPixels: 1,
        sizeMaxPixels: 2,
        _lighting: 'pbr',
        _animations: { '*': { speed: 1 } },
        transitions: {
            getPosition: 3600 * 0.9
        }
    });

    return { planeLayer, planeData };
}