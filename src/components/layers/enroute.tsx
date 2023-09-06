import type { RasterSource, RasterLayer } from 'mapbox-gl';
import { useState, useEffect, type RefObject, useMemo, type ChangeEvent } from 'react';
import { Source, Layer, type ViewState, type MapRef } from 'react-map-gl';
import { enrouteProducts, baseCDNURL } from '../../enrouteConfig';

const extractData = (data: string, attr: string, last = false) => {
    const idx = (last ? data.lastIndexOf : data.indexOf).apply(data, [attr]) + attr.length + 2;
    const val = data.slice(idx, data.indexOf('"', idx));
    return parseFloat(val);
}

interface EnrouteData {
    source: RasterSource;
    layer: RasterLayer;
}

const RASTER_OPACITY = 0.6;

interface UseEnrouteProductsProps {
    proxy: string | null;
    viewState?: ViewState;
    mapRef: RefObject<MapRef>
}

const checkOverlappingBounds = (bbox1: number[], bbox2: number[]) => {
    const [lon1_min, lat1_min, lon1_max, lat1_max] = bbox1;
    const [lon2_min, lat2_min, lon2_max, lat2_max] = bbox2;

    return (
        lon1_min <= lon2_max && 
        lon2_min <= lon1_max && 
        lat1_min <= lat2_max && 
        lat2_min <= lat1_max
    );
}

const convertId = (layerId: string) => layerId
    .replace('_layer', '')
    .replace(/WORLD_/, 'World ')
    .replace(/ENR/, 'Enroute')
    .replace(/_L(?=\d)/, ' Lo ')
    .replace(/_H(?=\d)/, ' Hi ')
    .replace(/_A(?=\d)/, ' Area ')
    .replace(/_AKL(?=\d)/, ' Alaska Lo ')
    .replace(/_AKH(?=\d)/, ' Alaska Hi ')
    .replace(/_P(?=\d)/, ' Pacific ')
    .replace(/(?<=\d)N/, ' North')
    .replace(/(?<=\d)S/, ' South')
    .replace('_', ' ');

export const useEnrouteProducts = ({ proxy, viewState, mapRef }: UseEnrouteProductsProps) => {
    const [opaque, setOpaque] = useState(false);
    const [enrouteData, setEnrouteData] = useState<EnrouteData[]>([]);
    const [enrouteLayers, setEnrouteLayers] = useState<JSX.Element[]>([]);
    const [currentLayer, setCurrentLayer] = useState('');
    const [currentBasemap, setCurrentBasemap] = useState('light-v11');

    const [fetchedData, setFetchedData] = useState(false);

    useEffect(() => {
        Promise.all<Promise<EnrouteData>[]>(
            enrouteProducts.map(async (product) => {
                const data = await fetch(`${baseCDNURL}/enroute/${product}/tilemapresource.xml`)
                    .then(res => res.text());

                const source: RasterSource = {
                    id: `${product}_source`,
                    type: 'raster',
                    bounds: ['minx', 'miny', 'maxx', 'maxy'].map(attr => extractData(data, attr)),
                    maxzoom:  extractData(data, 'order', true),
                    minzoom: extractData(data, 'order'),
                    scheme: 'tms',
                    tileSize: extractData(data, 'width'),
                    tiles: [
                        `${baseCDNURL}/enroute/${product}/{z}/{x}/{y}.png`
                    ]
                };

                const layer: RasterLayer = {
                    id: `${product}_layer`,
                    type: 'raster',
                };

                return { source, layer };
            })
        ).then(setEnrouteData).then(() => setFetchedData(true));
    }, []);
    
    useEffect(() => {
        if (!proxy || !fetchedData) return;

        const worldData: EnrouteData[] = [
            {
                source: {
                    id: `WORLD_VFR_source`,
                    type: 'raster',
                    minzoom: 1,
                    maxzoom:  11,
                    tileSize: 256,
                    format: 'jpg',
                    tiles: [
                        `${proxy}/V7pMh4xRihflnr61/301/2308/{z}/{x}/{y}.jpg`
                    ]
                },
                layer: {
                    id: `WORLD_VFR_layer`,
                    type: 'raster',
                }
            },
            {
                source: {
                    id: `WORLD_LO_source`,
                    type: 'raster',
                    minzoom: 1,
                    maxzoom:  10,
                    tileSize: 256,
                    format: 'jpg',
                    tiles: [
                        `${proxy}/V7pMh4xRihflnr61/302/2308/{z}/{x}/{y}.jpg`
                    ]
                },
                layer: {
                    id: `WORLD_LO_layer`,
                    type: 'raster',
                }
            },
            {
                source: {
                    id: `WORLD_HI_source`,
                    type: 'raster',
                    minzoom: 1,
                    maxzoom:  9,
                    tileSize: 256,
                    format: 'jpg',
                    tiles: [
                        `${proxy}/V7pMh4xRihflnr61/304/2308/{z}/{x}/{y}.jpg`
                    ]
                },
                layer: {
                    id: `WORLD_HI_layer`,
                    type: 'raster',
                }
            }
        ];

        setEnrouteData(prev => worldData.concat(prev));
    }, [proxy, fetchedData]);

    useEffect(() => {
        if (fetchedData) {
            const layers = enrouteData.map(({ source, layer }) => {
                layer.layout = {
                    visibility: layer.id === currentLayer ? 'visible' : 'none'
                };

                layer.paint = {
                    'raster-opacity': opaque ? 1 : RASTER_OPACITY,
                };

                return (
                    <Source key={source.id} {...source}>
                        <Layer {...layer} />
                    </Source>
                );
            }, []);

            setEnrouteLayers(layers);
        }
    }, [currentLayer, enrouteData, opaque, fetchedData, viewState, mapRef]);

    const availableData = useMemo(() =>
        enrouteData.reduce((arr: string[], { source, layer }) => 
            viewState && (
                layer.id.includes('WORLD') ||
                (
                    mapRef.current && source.bounds &&
                    checkOverlappingBounds(mapRef.current.getBounds().toArray().flat(), source.bounds)
                )
            ) ? arr.concat(layer.id) : arr, []), [enrouteData, mapRef, viewState]);

    const LayerSelect = () => {
        const handleOptionClick = (e: ChangeEvent<HTMLInputElement>) =>
            setCurrentLayer(e.target.value);

        return (
            <fieldset className='features enroutes'>
                <label>
                    <input 
                        type='radio' 
                        value=''
                        onChange={handleOptionClick}
                        checked={currentLayer === ''}
                    />
                    <span>None</span>
                </label>
                {
                    availableData.map(id => (
                        <label key={id}>
                            <input 
                                type='radio' 
                                value={id} 
                                onChange={handleOptionClick}
                                checked={currentLayer === id}
                            />
                            <span>{convertId(id)}</span>
                        </label>
                    ))
                }
            </fieldset>
        );
    };

    return { 
        enrouteLayers, currentLayer, 
        opaque, setOpaque,
        currentBasemap, setCurrentBasemap, 
        LayerSelect 
    };
}
