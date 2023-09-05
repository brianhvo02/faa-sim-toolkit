import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import { GeoJsonLayer } from '@deck.gl/layers/typed';
import { Layer, Map, MapRef, NavigationControl, SkyLayer, useControl } from 'react-map-gl';
import { useEnrouteProducts } from './layers';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { XATTData, XData, XGPSData, isXATT, isXGPS } from './data/sim';
import './index.scss';
import { useSearchParams } from 'react-router-dom';
import { MapFeature, useMapData } from './data/map';
import { useIPLocation } from './data/location';
import { useSimbrief } from './data/simbrief';
import { Feature, Position, Point } from 'geojson';
import { checkId } from './util';

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

const cifpProducts: Record<string, string> = {
    vhf_navaids: 'VHF Navaids',
    ndb_navaids_enroute: 'NDB Navaids (Enroute)',
    ndb_navaids_terminal: 'NDB Navaids (Terminal)',
    waypoints_enroute: 'Waypoints (Enroute)',
    waypoints_heliport: 'Waypoints (Heliport)',
    waypoints_terminal: 'Waypoints (Terminal)',
    airways_enroute: 'Airways (Enroute)',
    airports: 'Airports',
    runways: 'Runways',
    approaches: 'Approaches',
    sids: 'SIDs',
    stars: 'STARs',
}

const featuresMap = Object.keys(cifpProducts).reduce((acc, key) => ({ ...acc, [key]: false }), {});

const findFeatures = (results: Set<MapFeature>, allFeatures: MapFeature[], waypoint: string) => {
    const feature = allFeatures.find(feature => feature.id === waypoint);
    if (feature) {
        if (feature.geometry.type === 'MultiPoint') {
            const mutableFeature: Feature<Point> = {
                ...feature,
                geometry: {
                    type: 'Point',
                    coordinates: feature.geometry.coordinates[0]
                },
            };
            results.add(mutableFeature)
        } else {
            results.add(feature)
        }
    }
}

const Mapbox = () => {
    const [showText, setShowText] = useState(true);
    
    const [currentBasemap, setCurrentBasemap] = useState('light-v11');
    const [approach, setApproach] = useState('');
    const { briefing, setSimbriefUsername } = useSimbrief();
    const [params, setParams] = useSearchParams();
    const [proxy, setProxy] = useState(params.get('proxy') ?? 'http://localhost:5000');
    const [planeData, setPlaneData] = useState<PlaneData>();
    const mapRef = useRef<MapRef>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>(featuresMap);
    const { 
        enrouteLayers, enrouteData, 
        currentLayer, setCurrentLayer, 
        transparent, setTransparent 
    } = useEnrouteProducts(params.get('proxy'));

    const { features, allFeatures } = useMapData(selectedFeatures);
    const location = useIPLocation();

    const routeFeatures = useMemo(() => {
        if (briefing && allFeatures) {
            const routeFeatures = new Set<MapFeature>();
            const route = [
                `${briefing.origin.icao_code}_RW${briefing.origin.plan_rwy}`,
                ...briefing.general.route
                    .split(' '),
                `${briefing.destination.icao_code}_RW${briefing.destination.plan_rwy}`
            ];
            
            route.forEach((point, i, arr) => {
                if (i === 1 || i === arr.length - 2) {
                    const airport = i === 1 ? briefing.origin : briefing.destination;
                    const transition = arr[i === 1 ? i + 1 : i - 1];
                    const regex = RegExp(String.raw`${airport.icao_code}_${point}_(${transition}|RW${airport.plan_rwy}|RW${airport.plan_rwy.replace(/L|R/, 'B')}|ALL)`);
                    const features = allFeatures.filter(feature => 
                        checkId(feature.id) ? feature.id.match(regex) : false
                    );

                    if (
                        (i === 1 && features[0].id === `${airport.icao_code}_${point}_${transition}`)
                            ||
                        (i === arr.length - 2 && features[0].id !== `${airport.icao_code}_${point}_${transition}`)
                    ) features.reverse();

                    features.forEach(feature => {
                        feature.properties.fix_ident.forEach((waypoint: string) => 
                            findFeatures(routeFeatures, allFeatures, waypoint)
                        );
                    });
                } else if (i % 2) {
                    if (point === 'DCT') return;

                    const feature = allFeatures.find(feature => feature.id === point);
                    if (!feature) return;

                    const fix_idents = feature.properties.fix_ident;
                    const startIdx = fix_idents.indexOf(arr[i - 1]);
                    const endIdx = fix_idents.indexOf(arr[i + 1]);

                    const idents = fix_idents.slice(startIdx + 1, endIdx);

                    if (startIdx > endIdx)
                        idents.reverse();

                    idents.forEach((waypoint: string) => findFeatures(routeFeatures, allFeatures, waypoint));
                } else {
                    if (i === arr.length - 1 && approach.length) {
                        const features = allFeatures.filter(feature => feature.id === approach || (
                            approach.split('_').length === 3 && feature.id === approach.slice(0, approach.lastIndexOf('_'))
                        ));
                        if (features[0].id !== approach) features.reverse();
                        features.forEach(feature => {
                            console.log(feature)
                            feature.properties.fix_ident.forEach((waypoint: string) => {
                                if (point.includes(waypoint)) {
                                    findFeatures(routeFeatures, allFeatures, point)
                                } else {
                                    findFeatures(routeFeatures, allFeatures, waypoint)
                                }
                            });
                        })
                    } else {
                        findFeatures(routeFeatures, allFeatures, point);
                    }
                }
            });

            routeFeatures.add({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [...routeFeatures].reduce((coords: Position[], feature) => {
                        if (feature.geometry.type === 'Point') {
                            coords.push(feature.geometry.coordinates)
                        }
        
                        return coords;
                    }, [])
                },
                properties: {}
            });

            return [...routeFeatures];
        }
    }, [briefing, allFeatures, approach]);

    const approaches = useMemo(() => {
        if (briefing && allFeatures) {
            return allFeatures.reduce((dict: Record<string, string>, feature) => {
                if (
                    checkId(feature.id) 
                        && 
                    feature.id.match(
                        RegExp(String.raw`${briefing.destination.icao_code}_\w${briefing.destination.plan_rwy}`)
                    )
                ) dict[feature.id] = feature.id.replace(`${briefing.destination.icao_code}_`, '').replace('_', ' - ');

                return dict;
            }, {});
        }
    }, [briefing, allFeatures]);

    const handleSubmit = (cb: Function) => (e: FormEvent<HTMLFormElement>)=> {
        e.preventDefault();

        cb();
    }

    const handleSelectFeature = (e: ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.currentTarget;
        setSelectedFeatures(prev => ({ ...prev,  [value]: checked }));
    }

    const planeLayer = new ScenegraphLayer({
        id: 'scenegraph-layer',
        data: planeData && [planeData],
        scenegraph: './b738.glb',
        getPosition: (d: PlaneData) => [d.longitude ?? 0, d.latitude ?? 0, d.elevation ?? 0],
        getOrientation: (d: PlaneData) => [(d.pitch ?? 0), -(d.yaw ?? 0), (d.roll ?? 0) + 90],
        sizeScale: 50,
        _lighting: 'pbr'
    });

    const featureColor: [number, number, number] = useMemo(() => currentBasemap !== 'light-v11' && !currentLayer.length ? [252, 252, 253] : [41, 41, 41], [currentBasemap, currentLayer]);

    const featureLayer = new GeoJsonLayer({
        id: 'geojson-layer',
        data: routeFeatures ?? features,
        pickable: true,
        wrapLongitude: true,
        stroked: false,
        filled: true,
        pointType: showText ? 'circle+text' : 'circle',
        getLineColor: featureColor,
        getLineWidth: 500,
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 2,
        getFillColor: featureColor,
        getPointRadius: 2000,
        pointRadiusMinPixels: 2,
        pointRadiusMaxPixels: 8,
        getText: (d: MapFeature) => d.id,
        getTextColor: featureColor,
        getTextSize: 8000,
        textSizeMaxPixels: 16,
        textSizeMinPixels: 8,
        textSizeUnits: 'meters',
        getTextPixelOffset: [0, 16],
        textFontWeight: 700,
        onClick: d => console.log(d.object)
    });

    useEffect(() => {
        return () => {
            setApproach('');
        };
    }, []);

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

        const simbriefUsername = params.get('simbriefUsername');
        if (simbriefUsername) {
            setUsername(simbriefUsername);
            setSimbriefUsername(simbriefUsername);
        }
    }, [params, setSimbriefUsername]);

    const initialViewState = useMemo(() => {
        const viewState = localStorage.getItem('viewState');
        return viewState 
            ? JSON.parse(viewState)
            : {
                latitude: location?.lat,
                longitude: location?.lon,
                zoom: 12
            }
    }, [location]);

    const [username, setUsername] = useState('');

    return (
        <div className="map">
            <div className='layer-selector'>
                <div>
                    <label>Chart Layer
                        <select 
                            value={currentLayer} 
                            onChange={e => setCurrentLayer(e.target.value) }
                        >
                            <option value=''>None</option>
                            {
                                enrouteData.map(({ layer }) => (
                                    <option key={layer.id} value={layer.id}>{layer.id.replace('_layer', '')}</option>
                                ))
                            }
                        </select>
                    </label>
                    <label>Base Map
                        <select 
                            value={currentBasemap} 
                            onChange={e => setCurrentBasemap(e.target.value) }
                        >
                            <option value='light-v11'>Light</option>
                            <option value='dark-v10'>Dark</option>
                            <option value='satellite-v9'>Satellite</option>
                        </select>
                    </label>
                    {
                        !!currentLayer.length &&
                        <label>
                            <input 
                                type='checkbox' 
                                onChange={e => setTransparent(e.currentTarget.checked)}
                                checked={transparent}
                            />
                            Transparent
                        </label>
                    }
                </div>
                <div>
                    <label>
                        <input 
                            type='checkbox' 
                            onChange={e => setShowText(e.currentTarget.checked)}
                            checked={showText}
                        />
                        Show Text
                    </label>
                    {
                        Object.keys(cifpProducts).map(key => (
                            <label key={key}>
                                <input 
                                    type='checkbox' 
                                    value={key}
                                    checked={selectedFeatures[key]}
                                    onChange={handleSelectFeature} 
                                />
                                {cifpProducts[key]}
                            </label>
                        ))
                    }
                </div>
                <form onSubmit={handleSubmit(() => setParams({ proxy }))}>
                    <input
                        type='text'
                        value={proxy}
                        onChange={e => setProxy(e.target.value)}
                        placeholder='Enter url provided by plugin'
                    />
                    <button>Connect to proxy</button>
                </form>
                {
                    planeData &&
                    <button onClick={() => {
                        console.log(planeData)
                        mapRef.current?.flyTo({
                            center: [planeData?.longitude ?? 0, planeData?.latitude ?? 0]
                        })
                    }}>Fly to plane</button>
                }
                <form onSubmit={handleSubmit(() => setSimbriefUsername(username))}>
                    <input
                        type='text'
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder='Enter Simbrief username'
                    />
                    <button>Get briefing</button>
                </form>
                {
                    briefing && 
                    <>
                        <p>{briefing.origin.icao_code}/{briefing.origin.plan_rwy} {briefing.general.route} {briefing.destination.icao_code}/{briefing.destination.plan_rwy}</p>
                        {
                            approaches &&
                            <label>Approach
                                <select onChange={e => setApproach(e.target.value)} value={approach}>
                                    <option value='' />
                                    {
                                        Object.keys(approaches).map(id => 
                                            <option key={id} value={id}>{approaches[id]}</option>
                                        )
                                    }
                                </select>
                            </label>
                        }
                    </>
                }
            </div>
            {
                location &&
                <Map
                    initialViewState={initialViewState}
                    mapStyle={`mapbox://styles/mapbox/${currentBasemap}`}
                    // terrain={{source: 'mapbox-dem', exaggeration: 1.5}}
                    ref={mapRef}
                    projection={{ name: 'mercator' }}
                    onMove={e => localStorage.setItem('viewState', JSON.stringify(e.viewState))}
                >
                    <NavigationControl />
                    {/* <Source
                        id="mapbox-dem"
                        type="raster-dem"
                        url="mapbox://mapbox.mapbox-terrain-dem-v1"
                        tileSize={512}
                        maxzoom={14}
                    /> */}
                    <DeckGLOverlay layers={[planeLayer, featureLayer]} />
                    {enrouteLayers}
                    <Layer {...skyLayer} />
                </Map>
            }
        </div>
    );
};

export default Mapbox;