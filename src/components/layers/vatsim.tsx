import type { Feature, Point } from 'geojson';
import { useVatsim, type Pilot } from '../data/vatsim';
import { GeoJsonLayer } from '@deck.gl/layers/typed';

export const useVatsimLayer = (showText: boolean) => {
    const { vatsimFeatures, skipToken, setSkipToken } = useVatsim();

    const vatsimLayer = new GeoJsonLayer({
        id: 'geojson-layer',
        data: vatsimFeatures,
        pickable: true,
        stroked: false,
        filled: true,
        pointType: showText ? 'circle+text' : 'circle',
        getLineColor: [41, 41, 41],
        getLineWidth: 500,
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 2,
        getFillColor: [41, 41, 41],
        getPointRadius: 2000,
        pointRadiusMinPixels: 2,
        pointRadiusMaxPixels: 8,
        getText: (d: Feature<Point, Pilot>) => d.properties.callsign,
        getTextColor: [41, 41, 41],
        getTextSize: 8000,
        textSizeMaxPixels: 16,
        textSizeMinPixels: 8,
        textSizeUnits: 'meters',
        getTextPixelOffset: [0, 16],
        textFontWeight: 700,
        onClick: d => console.log(d.object)
    });

    return { vatsimLayer, skipToken, setSkipToken };
}