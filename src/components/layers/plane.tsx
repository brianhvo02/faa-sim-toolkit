import { type RefObject, useEffect, useState } from 'react';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import { 
    type XGPSData, type XATTData, type XData, 
    isXATT, isXGPS 
} from '../data/sim';
import { useSearchParams } from 'react-router-dom';
import type { MapRef } from 'react-map-gl';

type PlaneData = Partial<XGPSData & XATTData>;

export const usePlaneLayer = () => {
    const [params] = useSearchParams();
    const [planeData, setPlaneData] = useState<PlaneData>();

    useEffect(() => {
        const proxyUrl = params.get('proxy');
        if (proxyUrl) {
            const ws = new WebSocket(`${proxyUrl.replace('http', 'ws')}`);
            ws.onmessage = e => {
                const payload: XData = JSON.parse(e.data);
                if (isXGPS(payload) || isXATT(payload)) {
                    setPlaneData(prev => ({ ...prev, ...payload.data }));
                }
            }
    
            return () => ws.close();
        }
    }, [params]);

    const planeLayer = new ScenegraphLayer({
        id: 'scenegraph-layer',
        data: planeData && [planeData],
        scenegraph: './b738.glb',
        getPosition: (d: PlaneData) => [d.longitude ?? 0, d.latitude ?? 0, d.elevation ?? 0],
        getOrientation: (d: PlaneData) => [(d.pitch ?? 0), -(d.yaw ?? 0), (d.roll ?? 0) + 90],
        sizeScale: 50,
        _lighting: 'pbr'
    });

    const GoToPlaneButton = ({ mapRef }: { mapRef: RefObject<MapRef> }) => planeData ? (
        <button onClick={() => {
            console.log(planeData)
            mapRef.current?.flyTo({
                center: [planeData?.longitude ?? 0, planeData?.latitude ?? 0]
            })
        }}>Fly to plane</button>
    ) : null;

    return { planeLayer, GoToPlaneButton };
}