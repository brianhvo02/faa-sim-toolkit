import { useCallback, useEffect, useState } from 'react';
import type { ViewState, ViewStateChangeEvent } from 'react-map-gl';

interface IPLocationResponse {
    ip: string;
    city: string;
    region: string;
    country: string;
    loc: string;
    org: string;
    postal: string;
    timezone: string;
}

const getCenterTile = ({ zoom, longitude, latitude }: ViewState) => {
    const z = Math.floor(zoom);
    const latRad = latitude / 180 * Math.PI;
    const n = Math.pow(2, z);
    const x = Math.floor(n * ((longitude + 180) / 360));
    const y = Math.floor(n * (1 - (Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2);
    // const basemap = currentBasemap === 'satellite-v9'
    //     ? 'light-v11'
    //     : 'satellite-v9';
    return `https://api.mapbox.com/styles/v1/mapbox/[BASEMAP]/tiles/${Math.floor(z)}/${x}/${y}?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}`;
};

export const useIPLocation = () => {
    const [initialViewState, setInitialViewState] = useState<ViewState>();
    const [viewState, setViewState] = useState<ViewState>();
    const [centerTile, setCenterTile] = useState<string>();

    const onMapMove = useCallback((e: ViewStateChangeEvent) => {
        const url = getCenterTile(e.viewState);
        setCenterTile(url);
        setViewState(e.viewState);
        localStorage.setItem('viewState', JSON.stringify(e.viewState));
    }, []);
    
    useEffect(() => {
        const viewStateRaw = localStorage.getItem('viewState');
        if (viewStateRaw) {
            const viewState = JSON.parse(viewStateRaw);
            setInitialViewState(viewState);
            setViewState(viewState);
            const url = getCenterTile(viewState);
            setCenterTile(url);
        } else {
            const controller = new AbortController();
            fetch(`https://ipinfo.io?token=${process.env.REACT_APP_IPINFO_ACCESS_TOKEN}`, { signal: controller.signal })
                .then(res => res.json())
                .then(({ loc }: IPLocationResponse) => {
                    const [ latitude, longitude ] = loc.split(',').map(parseFloat);
                    const viewState = { 
                        latitude, longitude, zoom: 12, 
                        bearing: 0, pitch: 0, 
                        padding: { 
                            top: 0, bottom: 0, 
                            left: 0, right: 0 
                        }
                    };
                    setInitialViewState(viewState);
                    setViewState(viewState);
                    const url = getCenterTile(viewState);
                    setCenterTile(url);
                })
                .catch(console.error);
    
            return () => controller.abort();
        }
    }, []);
    
    return { initialViewState, viewState, centerTile, onMapMove };
}