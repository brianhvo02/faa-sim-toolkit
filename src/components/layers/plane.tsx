import { type RefObject, useEffect, useState } from 'react';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import { useSearchParams } from 'react-router-dom';
import type { MapRef } from 'react-map-gl';
import { isPositionData, type PositionData, type SimPayload } from '../data/sim';
import ws from 'ws';

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
        id: 'scenegraph-layer',
        data: planeData && [planeData],
        scenegraph: './plane.glb',
        getPosition: (d: PositionData) => [d.longitude ?? 0, d.latitude ?? 0, (d.altitudeMSL ?? 0)],
        getOrientation: (d: PositionData) => [-d.roll, 180 - d.yaw , 90 - d.pitch],
        sizeScale: 100,
        _lighting: 'pbr',
        _animations: { '*': { speed: 1 } }
    });

    return { planeLayer, planeData };
}