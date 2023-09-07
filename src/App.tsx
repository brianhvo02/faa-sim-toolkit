import { FullscreenControl, Layer, Map, NavigationControl } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import { DeckGLOverlay, skyLayer } from './components/layers';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIPLocation } from './components/data/location';
import { SimbriefForm, useSimbrief } from './components/data/simbrief';
import { faCog, faLayerGroup, faMap } from '@fortawesome/free-solid-svg-icons';
import { useEnrouteProducts } from './components/layers/enroute';
import { useFeatureLayer } from './components/layers/geojson';
import { usePlaneLayer } from './components/layers/plane';
import { handleSubmit } from './components/util';
import SelectList from './components/SelectList';
import './App.scss';
import 'mapbox-gl/dist/mapbox-gl.css';

const App = () => {
    const [params, setParams] = useSearchParams();
    const [proxy, setProxy] = useState(params.get('proxy') ?? 'http://localhost:5000');
    const mapRef = useRef<MapRef>(null);
    
    const [approach, setApproach] = useState('');

    const { initialViewState, viewState, centerTile, onMapMove } = useIPLocation();

    const { briefing } = useSimbrief();
    const { 
        enrouteLayers, currentLayer, 
        opaque, setOpaque,
        currentBasemap, setCurrentBasemap, 
        LayerSelect 
    } = useEnrouteProducts({
        proxy: params.get('proxy'), 
        viewState,
        mapRef
    });
    const { 
        featureLayer, allFeatures,
        showText, setShowText, 
        FeatureSelection, ApproachSelect
    } = useFeatureLayer({
        briefing,
        currentBasemap, currentLayer,
        approach, setApproach
    });
    const { planeLayer, GoToPlaneButton } = usePlaneLayer();

    return (
        <div className='map'>
            {
                briefing &&
                <>
                    <div className='route-text'>
                        <p>{briefing.origin.icao_code}/{briefing.origin.plan_rwy} {briefing.general.route} {briefing.destination.icao_code}/{briefing.destination.plan_rwy}</p>
                    </div>
                    <ApproachSelect 
                        currentBasemap={currentBasemap} 
                        briefing={briefing}
                        allFeatures={allFeatures}
                        approach={approach}
                        setApproach={setApproach}
                    />
                </>
            }
            {
                <SelectList currentBasemap={currentBasemap} icon={faCog} >
                    <div className='settings'>
                        <form onSubmit={handleSubmit(() => setParams({ ...Object.fromEntries(params), proxy }))}>
                            <input
                                type='text'
                                value={proxy}
                                onChange={e => setProxy(e.target.value)}
                                placeholder='Enter url provided by plugin'
                            />
                            <button>Connect to proxy</button>
                        </form>
                        <SimbriefForm currentBasemap={currentBasemap} />
                        <GoToPlaneButton mapRef={mapRef} />
                    </div>
                </SelectList>
            }
            {
                <SelectList 
                    eyeText='Toggle transparency' 
                    eyeStatus={opaque}
                    setEyeStatus={setOpaque}
                    currentBasemap={currentBasemap}
                    icon={faMap} 
                    className='enroute-layer' 
                >
                    <LayerSelect />
                </SelectList>
            }
            {
                initialViewState &&
                <Map
                    initialViewState={initialViewState}
                    mapStyle={`mapbox://styles/mapbox/${currentBasemap}`}
                    // terrain={{source: 'mapbox-dem'={} exaggeration: 1.5}}
                    ref={mapRef}
                    projection={{ name: 'mercator' }}
                    // onLoad={() => setViewState(prev => prev ? ({ ...prev }) : prev)}
                    onMove={onMapMove}
                    logoPosition='bottom-right'
                >
                    <NavigationControl />
                    <FullscreenControl />
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
                <SelectList 
                    eyeText='Toggle text'
                    eyeStatus={showText}
                    setEyeStatus={setShowText}
                    currentBasemap={currentBasemap} 
                    icon={faLayerGroup} 
                    className='feature-layer' 
                >
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
                </SelectList>
            }
        </div>
    );
};

export default App;