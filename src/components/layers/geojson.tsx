import { GeoJsonLayer } from '@deck.gl/layers/typed';
import type { Feature, Point, Position } from 'geojson';
import { type ChangeEvent, useEffect, useMemo, useState, type SetStateAction, type Dispatch } from 'react';
import { type MapFeature, useMapData } from '../data/map';
import type { Briefing } from '../data/simbrief';
import { checkId } from '../util';
import { faChevronCircleDown, faChevronCircleUp, faPlaneArrival } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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

interface UseFeatureLayerProps {
    currentBasemap: string;
    currentLayer: string;
    approach: string;
    setApproach: Dispatch<SetStateAction<string>>;
    briefing?: Briefing;
}

export const useFeatureLayer = ({ 
    briefing,
    currentBasemap, currentLayer, 
    approach, setApproach
}: UseFeatureLayerProps) => {
    const featureColor: [number, number, number] = useMemo(() => currentBasemap !== 'light-v11' && !currentLayer.length ? [252, 252, 253] : [41, 41, 41], [currentBasemap, currentLayer]);
    const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>(featuresMap);
    const { features, allFeatures } = useMapData(selectedFeatures);

    useEffect(() => {
        return () => {
            setApproach('');
        };
    }, [setApproach]);

    const [showText, setShowText] = useState(true);
    const handleSelectFeature = (e: ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.currentTarget;
        setSelectedFeatures(prev => ({ ...prev,  [value]: checked }));
    }

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

    const FeatureSelection = () => Object.keys(cifpProducts).map(key =>
        <label key={key}>
            <input 
                type='checkbox' 
                value={key}
                checked={selectedFeatures[key]}
                onChange={handleSelectFeature} 
            />
            <span>{cifpProducts[key]}</span>
        </label>
    );

    return { 
        featureLayer, allFeatures,
        showText, setShowText, 
        FeatureSelection, ApproachSelect 
    };
}

interface ApproachSelectProps {
    currentBasemap: string;
    briefing: Briefing;
    allFeatures?: MapFeature[];
    approach: string;
    setApproach: Dispatch<SetStateAction<string>>;
}

const ApproachSelect = ({
    currentBasemap, briefing, allFeatures,
    approach, setApproach
}: ApproachSelectProps) => {
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
    const handleOptionClick = (e: ChangeEvent<HTMLInputElement>) =>
        setApproach(e.target.value);
    const [showLayerSelect, setShowLayerSelect] = useState(false);
    if (!briefing || !approaches) return null;

    return (
        <div 
            className='approach-select'
            style={{
                transform: `translate(-50%, ${
                    showLayerSelect
                        ? '7rem'
                        : 'calc(2rem - 100%)'
                })`
            }}
        >
            <fieldset className='features approaches'>
                <label>
                    <input 
                        type='radio' 
                        value=''
                        onChange={handleOptionClick}
                        checked={approach === ''}
                    />
                    <span>None</span>
                </label>
                {
                    Object.keys(approaches).map(id => (
                        <label key={id}>
                            <input 
                                type='radio' 
                                value={id} 
                                onChange={handleOptionClick}
                                checked={approach === id}
                            />
                            <span>{id}</span>
                        </label>
                    ))
                }
            </fieldset>
            <div
                className='approach-toggle'
                onClick={() => setShowLayerSelect(prev => !prev)}
                style={{
                    color: currentBasemap === 'light-v11'
                        ? '#292929'
                        : '#FCFCFD'
                }}
            >
                <FontAwesomeIcon icon={faPlaneArrival} />
                {
                    showLayerSelect
                        ? <FontAwesomeIcon icon={faChevronCircleUp} />
                        : <FontAwesomeIcon icon={faChevronCircleDown} />
                }
            </div>
        </div>
    );
}