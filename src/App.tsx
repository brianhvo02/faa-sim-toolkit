import { Layer, Map, NavigationControl } from 'react-map-gl';
import type { MapRef, ViewState } from 'react-map-gl';
import { DeckGLOverlay, skyLayer } from './components/layers';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIPLocation } from './components/data/location';
import { SimbriefForm, useSimbrief } from './components/data/simbrief';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronCircleLeft, faChevronCircleRight, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { useEnrouteProducts } from './components/layers/enroute';
import { useFeatureLayer } from './components/layers/geojson';
import { usePlaneLayer } from './components/layers/plane';
import { handleSubmit } from './components/util';
import './App.scss';

const getCenterTile = (zoom: number, lng: number, lat: number) => {
    const z = Math.floor(zoom);
    const latRad = lat / 180 * Math.PI;
    const n = Math.pow(2, z);
    const x = Math.floor(n * ((lng + 180) / 360));
    const y = Math.floor(n * (1 - (Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2);
    // const basemap = currentBasemap === 'satellite-v9'
    //     ? 'light-v11'
    //     : 'satellite-v9';
    return `https://api.mapbox.com/styles/v1/mapbox/[BASEMAP]/tiles/${Math.floor(z)}/${x}/${y}?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}`;
};

const App = () => {
    const [params, setParams] = useSearchParams();
    const [proxy, setProxy] = useState(params.get('proxy') ?? 'http://localhost:5000');
    const mapRef = useRef<MapRef>(null);
    const [showLayerSelect, setShowLayerSelect] = useState(false);

    const { briefing } = useSimbrief();
    const { 
        enrouteLayers, currentLayer, currentBasemap, setCurrentBasemap, LayerSelector 
    } = useEnrouteProducts(params.get('proxy'));
    const {
        featureLayer,
        FeatureSelection,
        ApproachSelection
    } = useFeatureLayer({currentBasemap, currentLayer, briefing});
    const { planeLayer, GoToPlaneButton } = usePlaneLayer();

    const location = useIPLocation();
    const initialViewState = useMemo((): ViewState => {
        const viewState = localStorage.getItem('viewState');
        return viewState 
            ? JSON.parse(viewState)
            : {
                latitude: location?.lat,
                longitude: location?.lon,
                zoom: 12
            }
    }, [location]);

    const [centerTile, setCenterTile] = useState<string>();

    useEffect(() => {
        const { zoom, longitude, latitude } = initialViewState;
        const url = getCenterTile(zoom, longitude, latitude);
        setCenterTile(url);
    }, [initialViewState]);

    return (
        <div className="map">
            <div className='layer-selector'>
                <LayerSelector />
                <form onSubmit={handleSubmit(() => setParams({ ...Object.fromEntries(params), proxy }))}>
                    <input
                        type='text'
                        value={proxy}
                        onChange={e => setProxy(e.target.value)}
                        placeholder='Enter url provided by plugin'
                    />
                    <button>Connect to proxy</button>
                </form>
                <GoToPlaneButton mapRef={mapRef} />
                <SimbriefForm />
                <ApproachSelection />
            </div>
            {
                location &&
                <Map
                    initialViewState={initialViewState}
                    mapStyle={`mapbox://styles/mapbox/${currentBasemap}`}
                    // terrain={{source: 'mapbox-dem'={} exaggeration: 1.5}}
                    ref={mapRef}
                    projection={{ name: 'mercator' }}
                    onMove={e => {
                        const { zoom, longitude, latitude } = e.viewState;
                        const url = getCenterTile(zoom, longitude, latitude);
                        setCenterTile(url);
                        localStorage.setItem('viewState', JSON.stringify(e.viewState));
                    }}
                    logoPosition='bottom-right'
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
            {
                centerTile &&
                <div className='layers-container'>
                    <div className='layers' style={{
                        left: showLayerSelect
                            ? 0
                            : 'calc(1.5rem - 100%)'
                    }}>
                        {
                            ['light-v11', 'dark-v10', 'satellite-v9'].map(basemap => {
                                if (basemap === currentBasemap) return null;

                                const tile = centerTile.replace('[BASEMAP]', basemap);
                                return (
                                    <div key={basemap} className='layer' onClick={() => setCurrentBasemap(basemap)}>
                                        <img src={tile} alt={basemap} />
                                            {/* <FontAwesomeIcon icon={faLayerGroup} /> */}
                                        <div style={{
                                            color: basemap === 'light-v11'
                                                ? '#292929'
                                                : '#FCFCFD'
                                        }}>
                                            {basemap[0].toUpperCase()}{basemap.slice(1, basemap.indexOf('-'))}
                                        </div>
                                    </div>
                                );
                            })
                        }
                        {
                            !briefing &&
                            <div className='features'>
                                <FeatureSelection />
                            </div>
                        }
                        <div
                            className='revealer'
                            onClick={() => setShowLayerSelect(prev => !prev)}
                            style={{
                                color: currentBasemap === 'light-v11'
                                    ? '#292929'
                                    : '#FCFCFD'
                            }}
                        >
                            <FontAwesomeIcon icon={faLayerGroup} />
                            {
                                showLayerSelect
                                    ? <FontAwesomeIcon icon={faChevronCircleLeft} />
                                    : <FontAwesomeIcon icon={faChevronCircleRight} />
                            }
                        </div>
                    </div>
                </div>
            }
        </div>
    );
};

export default App;