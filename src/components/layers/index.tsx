import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox/typed';
import type { SkyLayer } from 'mapbox-gl';
import { useControl } from 'react-map-gl';

export const DeckGLOverlay = (props: MapboxOverlayProps & {
    interleaved?: boolean;
}) => {
    const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
    overlay.setProps(props);
    return null;
}

export const skyLayer: SkyLayer = {
    id: 'sky',
    type: 'sky',
    paint: {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': [0.0, 0.0],
      'sky-atmosphere-sun-intensity': 15
    }
};