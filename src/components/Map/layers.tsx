import { useEffect, useState } from 'react';
import { baseCDNURL, enrouteProducts } from '../../enrouteConfig'
import { RasterLayer, Source, Layer, RasterSource } from 'react-map-gl';

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

export const useEnrouteProducts = (proxy: string | null) => {
    const [transparent, setTransparent] = useState(true);
    const [enrouteData, setEnrouteData] = useState<EnrouteData[]>([]);
    const [enrouteLayers, setEnrouteLayers] = useState<JSX.Element[]>([]);
    const [currentLayer, setCurrentLayer] = useState('');

    useEffect(() => {
        Promise.all<Promise<EnrouteData>[]>(
            (proxy
                ? [
                    new Promise<EnrouteData>(resolve => resolve({
                        source: {
                            id: `world_vfr_source`,
                            type: 'raster',
                            minzoom: 1,
                            maxzoom:  11,
                            tileSize: 256,
                            format: 'jpg',
                            tiles: [
                                `${proxy}/V7pMh4xRihflnr61/301/2308/{z}/{x}/{y}.jpg`
                            ]
                        } as RasterSource,
                        layer: {
                            id: `world_vfr_layer`,
                            type: 'raster',
                        } as RasterLayer
                    })),
                    new Promise<EnrouteData>(resolve => resolve({
                        source: {
                            id: `world_lo_source`,
                            type: 'raster',
                            minzoom: 1,
                            maxzoom:  10,
                            tileSize: 256,
                            format: 'jpg',
                            tiles: [
                                `${proxy}/V7pMh4xRihflnr61/302/2308/{z}/{x}/{y}.jpg`
                            ]
                        } as RasterSource,
                        layer: {
                            id: `world_lo_layer`,
                            type: 'raster',
                        } as RasterLayer
                    })),
                    new Promise<EnrouteData>(resolve => resolve({
                        source: {
                            id: `world_hi_source`,
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
                            id: `world_hi_layer`,
                            type: 'raster',
                        }
                    }))
                ]
                : []
            ).concat(
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
            )
        ).then(setEnrouteData);
    }, [proxy]);

    useEffect(() => {
        if (enrouteData.length === enrouteProducts.length + 3) {
            const layers = enrouteData.map(({ source, layer }) => {
                layer.layout = {
                    visibility: layer.id === currentLayer ? 'visible' : 'none'
                };

                layer.paint = {
                    'raster-opacity': transparent ? RASTER_OPACITY : 1,
                };
                
                return (
                    <Source key={source.id} {...source}>
                        <Layer {...layer} />
                    </Source>
                );
            });

            setEnrouteLayers(layers);
        }
    }, [currentLayer, enrouteData, transparent])

    return { 
        enrouteLayers, enrouteData, 
        currentLayer, setCurrentLayer,
        transparent, setTransparent
    };
}

