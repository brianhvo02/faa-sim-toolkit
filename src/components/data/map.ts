import type { Feature, LineString, MultiPoint, Point } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { baseCDNURL } from '../../enrouteConfig';

export type MapFeature = Feature<Point | MultiPoint | LineString, any>;

export const useMapData = (selectedFeatures: Record<string, boolean>) => {
    const [mapData, setMapData] = useState<Record<string, Record<string, MapFeature>>>();

    const allFeatures = useMemo(() => 
        mapData && selectedFeatures && Object
            .keys(selectedFeatures)
            .reduce((arr: MapFeature[], type) => 
                arr.concat(...Object.values(mapData[type])), 
                []
            ), [mapData, selectedFeatures]
    );

    const features = useMemo(() => 
        mapData && selectedFeatures && Object
            .keys(selectedFeatures)
            .reduce((arr: MapFeature[], type) => selectedFeatures[type] 
                ? arr.concat(...Object.values(mapData[type])) 
                : arr, []
            ), [mapData, selectedFeatures]
    );

    useEffect(() => {
        const controller = new AbortController();

        Promise.all([
            fetch(`${baseCDNURL}/procedures.json`, { signal: controller.signal })
                .then(res => res.json()),
            fetch(`${baseCDNURL}/points.json`, { signal: controller.signal })
                .then(res => res.json())
        ]).then(([procedures, points]) => setMapData({ ...procedures, ...points })).catch(e => console.error(e))
            

        return () => {
            controller.abort();
            setMapData(undefined);
        }
    }, []);

    return { mapData, allFeatures, features };
}