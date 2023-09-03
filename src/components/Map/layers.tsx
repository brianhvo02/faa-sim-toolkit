import { useEffect, useState } from 'react';
import { baseEnrouteURL, enrouteProducts } from '../../enrouteConfig'
import { SourceProps, RasterLayer, Source, Layer } from 'react-map-gl';

const extractData = (data: string, attr: string, last = false) => {
    const idx = (last ? data.lastIndexOf : data.indexOf).apply(data, [attr]) + attr.length + 2;
    const val = data.slice(idx, data.indexOf('"', idx));
    return parseFloat(val);
}

interface EnrouteData {
    source: SourceProps;
    layer: RasterLayer;
}

export const useEnrouteProducts = () => {
    const [enrouteData, setEnrouteData] = useState<EnrouteData[]>([]);
    const [enrouteLayers, setEnrouteLayers] = useState<JSX.Element[]>([]);
    const [currentLayer, setCurrentLayer] = useState('');

    useEffect(() => {
        Promise.all(
            enrouteProducts.map(async product => {
                const data = await fetch(`${baseEnrouteURL}/${product}/tilemapresource.xml`)
                    .then(res => res.text());

                const source: SourceProps = {
                    id: `${product}_source`,
                    type: 'raster',
                    bounds: ['minx', 'miny', 'maxx', 'maxy'].map(attr => extractData(data, attr)),
                    maxzoom:  extractData(data, 'order', true),
                    minzoom: extractData(data, 'order'),
                    scheme: 'tms',
                    tileSize: extractData(data, 'width'),
                    tiles: [
                        `${baseEnrouteURL}/${product}/{z}/{x}/{y}.png`
                    ]
                };

                const layer: RasterLayer = {
                    id: `${product}_layer`,
                    type: 'raster',
                    paint: {
                        'raster-opacity': 0.75,
                    },
                    layout: {
                        visibility: 'none'
                    }
                };

                return { source, layer };
            })
        ).then(setEnrouteData);
    }, []);

    useEffect(() => {
        if (enrouteData.length === enrouteProducts.length) {
            const layers = enrouteData.map(({ source, layer }) => {
                layer.layout = {
                    visibility: layer.id === currentLayer ? 'visible' : 'none'
                };
                
                return (
                    <Source key={source.id} {...source}>
                        <Layer {...layer} />
                    </Source>
                );
            });

            setEnrouteLayers(layers);
        }
    }, [currentLayer, enrouteData])

    return { enrouteLayers, enrouteData, currentLayer, setCurrentLayer };
}

