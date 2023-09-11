import { useEffect, useMemo, useState } from 'react';
import { TextLayer } from '@deck.gl/layers/typed';
import { ScenegraphLayer } from '@deck.gl/mesh-layers/typed';
import type { Feature, FeatureCollection, Point } from 'geojson';

interface Transceiver {
    id: number;
    frequency: number;
    latDeg: number;
    lonDeg: number;
    heightMslM: number;
    heightAglM: number;
}

interface TransceiverData {
    callsign: string;
    transceivers: Transceiver[];
}

interface FlightPlan {
    flight_rules: string;
    aircraft: string;
    aircraft_faa: string;
    aircraft_short: string;
    departure: string;
    arrival: string;
    alternate: string;
    cruise_tas: string;
    altitude: string;
    deptime: string;
    enroute_time: string;
    fuel_time: string;
    remarks: string;
    route: string;
    revision_id: number;
    assigned_transponder: string;
}

export interface Pilot {
    cid: number;
    name: string;
    callsign: string;
    server: string;
    pilot_rating: number;
    military_rating: number;
    latitude: number;
    longitude: number;
    altitude: number;
    groundspeed: number;
    transponder: string;
    heading: number;
    qnh_i_hg: number;
    qnh_mb: number;
    flight_plan?: FlightPlan;
    logon_time: string;
    last_updated: string;
}

interface GeneralInfo {
    version: number;
    reload: number;
    update: string;
    update_timestamp: string;
    connected_clients: number;
    unique_users: number;
}

interface Controller {
    cid: number;
    name: string;
    callsign: string;
    frequency: string;
    facility: number;
    rating: number;
    server: string;
    visual_range: number;
    text_atis: string[];
    last_updated: string;
    logon_time: string;
}

interface Rating {
    id: number;
    short: string;
    long: string;
}


export interface VatsimData {
    general: GeneralInfo;
    pilots: Pilot[];
    controllers: Controller[];
    facilities: Rating[];
    ratings: Rating[];
    pilot_ratings: Rating[];
    military_ratings: Rating[];
}

type PlaneData = Partial<Pilot & TransceiverData> & { callsign: string; };

export const useVatsim = (featureColor: [number, number, number], vatsimInterval = 10000, transceiverInterval = 2000) => {
    const [skipToken, setSkipToken] = useState(true);
    const [planeData, setPlaneData] = useState<Record<string, PlaneData>>({});

    useEffect(() => {
        if (!skipToken) {
            setPlaneData({});
            return;
        };

        const controller = new AbortController();

        const options = { signal: controller.signal };

        const vatsimTimer = setInterval(() => {
            fetch('https://data.vatsim.net/v3/vatsim-data.json', options)
                .then(res => res.json())
                .then((data: VatsimData) => {
                    setPlaneData(prev => {
                        data.pilots.forEach(pilot => {
                            prev[pilot.callsign] = {
                                ...prev[pilot.callsign],
                                ...pilot
                            };
                        });
            
                        return { ...prev };
                    });
                })
                .catch(console.error);
        }, vatsimInterval);

        const transceiverTimer = setInterval(() => {
            fetch('https://data.vatsim.net/v3/transceivers-data.json', options)
                .then(res => res.json())
                .then((data: TransceiverData[]) => {
                    setPlaneData(prev => {
                        data.forEach(({ callsign, transceivers }) => {
                            prev[callsign] = {
                                ...prev[callsign],
                                transceivers
                            };
                        });
            
                        return { ...prev };
                    });
                })
                .catch(console.error);
        }, transceiverInterval);
        
        return () => {
            controller.abort();
            clearInterval(vatsimTimer);
            clearInterval(transceiverTimer);
        };
    }, [skipToken, vatsimInterval, transceiverInterval]);

    const getPosition = (plane: PlaneData): [number, number, number] => {
        const { latitude, longitude, altitude } = plane;
        if (plane.transceivers && plane.transceivers.length) {
            const { length } = plane.transceivers;
            return plane.transceivers.reduce((coords, transceiver) => {
                coords[0] += transceiver.lonDeg;
                coords[1] += transceiver.latDeg;
                coords[2] += transceiver.heightMslM;

                return coords;
            }, [0, 0, 0])
            .map(component => component / length) as [number, number, number];
        } else if (latitude && longitude && altitude) {
            return [latitude, longitude, altitude * 0.3048];
        } else {
            return [0, 0, 0];
        }
    }

    const data = useMemo(() => 
        Object.values(planeData).filter(data => data.callsign), [planeData])

    const vatsimTextLayer = new TextLayer({
        id: 'vatsim-text-layer',
        data,
        getPosition,
        getText: (plane: PlaneData) => plane.callsign,
        getColor: featureColor,
        sizeMaxPixels: 16,
        sizeMinPixels: 8,
        getPixelOffset: [0, 16],
        fontWeight: 700
    });

    const vatsimPlaneLayer = new ScenegraphLayer({
        id: 'vatsim-plane-layer',
        data,
        scenegraph: './airplane.glb',
        getPosition,
        getOrientation: (plane: PlaneData) => [0, plane.heading ?? 0, 90],
        sizeMinPixels: 0.5,
        sizeMaxPixels: 1,
        _lighting: 'pbr',
        onClick: d => console.log(d)
    });

    return { vatsimTextLayer, vatsimPlaneLayer, skipToken, setSkipToken };
}