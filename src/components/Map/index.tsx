import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import { Layer, Map, MapRef, NavigationControl, SkyLayer, useControl } from 'react-map-gl';
import { useEnrouteProducts } from './layers';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { XATTData, XData, XGPSData, isXATT, isXGPS } from './simdata';
import './index.scss';
import { useSearchParams } from 'react-router-dom';

const DeckGLOverlay = (props: MapboxOverlayProps & {
    interleaved?: boolean;
}) => {
    const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
    overlay.setProps(props);
    return null;
}

const skyLayer: SkyLayer = {
    id: 'sky',
    type: 'sky',
    paint: {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': [0.0, 0.0],
      'sky-atmosphere-sun-intensity': 15
    }
};

type PlaneData = Partial<XGPSData & XATTData>;

const Mapbox = () => {
    const { enrouteLayers, enrouteData, currentLayer, setCurrentLayer } = useEnrouteProducts();
    const [params, setParams] = useSearchParams();
    const [wsUrl, setWsUrl] = useState(params.get('wsUrl') ?? '');
    const [planeData, setPlaneData] = useState<PlaneData>();
    const mapRef = useRef<MapRef>(null);

    const handleSubmit = (e: FormEvent<HTMLFormElement>)=> {
        e.preventDefault();

        setParams({ wsUrl });
    }

    const layer = new ScenegraphLayer({
        id: 'scenegraph-layer',
        data: planeData && [planeData],
        scenegraph: './b738.glb',
        getPosition: (d: PlaneData) => [d.longitude ?? 0, d.latitude ?? 0, d.elevation ?? 0],
        getOrientation: (d: PlaneData) => [(d.pitch ?? 0), -(d.yaw ?? 0), (d.roll ?? 0) + 90],
        sizeScale: 50,
        _lighting: 'pbr'
    });

    useEffect(() => {
        if (params.get('wsUrl')) {
            const ws = new WebSocket(`wss://${params.get('wsUrl')}`);
            ws.onmessage = e => {
                const payload: XData = JSON.parse(e.data);
                if (isXGPS(payload) || isXATT(payload)) {
                    setPlaneData(prev => ({ ...prev, ...payload.data }));
                }
            }
    
            return () => ws.close();
        }
    }, [params]);

    return (
        <div className="map">
            <div className='layer-selector'>
                <select 
                    value={currentLayer} 
                    onChange={e => setCurrentLayer(e.target.value) }
                >
                    <option value='' />
                    {
                        enrouteData.map(({ layer }) => (
                            <option key={layer.id} value={layer.id}>{layer.id.replace('_layer', '')}</option>
                        ))
                    }
                </select>
                <form onSubmit={handleSubmit}>
                    <input
                        type='text'
                        value={wsUrl}
                        onChange={e => setWsUrl(e.target.value)}
                    />
                    <button>Connect</button>
                </form>
                <button onClick={() => {
                    console.log(planeData)
                    mapRef.current?.flyTo({
                        center: [planeData?.longitude ?? 0, planeData?.latitude ?? 0]
                    })
                }}>Fly</button>
            </div>
            <Map
                initialViewState={{
                    latitude: 42.05904181125081,
                    longitude: -125.11866059039367,
                    bounds: [-125.11866059039367, 42.05904181125081, -121.08579533793011, 49.39406137988885],
                    zoom: 12
                }}
                mapStyle='mapbox://styles/mapbox/satellite-v9'
                // terrain={{source: 'mapbox-dem', exaggeration: 1.5}}
                ref={mapRef}
            >
                <NavigationControl />
                <DeckGLOverlay layers={[layer]} />
                {enrouteLayers}
                {/* <Source
                    id="mapbox-dem"
                    type="raster-dem"
                    url="mapbox://mapbox.mapbox-terrain-dem-v1"
                    tileSize={512}
                    maxzoom={14}
                /> */}
                <Layer {...skyLayer} />
            </Map>
        </div>
    );
};

export default Mapbox;