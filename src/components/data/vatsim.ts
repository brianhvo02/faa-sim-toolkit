import { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection, Point } from 'geojson';

// interface Transceiver {
//     id: number;
//     frequency: number;
//     latDeg: number;
//     lonDeg: number;
//     heightMslM: number;
//     heightAglM: number;
// }

// interface TransceiverData {
//     callsign: string;
//     transceivers: Transceiver[];
// }

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
    callsign?: string;
    server?: string;
    pilot_rating?: number;
    military_rating?: number;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    groundspeed?: number;
    transponder?: string;
    heading?: number;
    qnh_i_hg?: number;
    qnh_mb?: number;
    flight_plan: FlightPlan;
    logon_time?: string;
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

interface Rating {
    id: number;
    short: string;
    long: string;
}

interface VatsimData {
    general: GeneralInfo;
    pilots: Pilot[];
    facilities: Rating[];
    ratings: Rating[];
    pilot_ratings: Rating[];
    military_ratings: Rating[];
}

export type VatsimFeatureCollection = FeatureCollection<Point, Pilot>;

export const useVatsim = (interval: number = 2000) => {
    const [skipToken, setSkipToken] = useState(true);
    // const [transceiverData, setTransceiverData] = useState<TransceiverData[]>([]);
    const [vatsimData, setVatsimData] = useState<VatsimData>();
    const vatsimFeatures = useMemo(() => 
        vatsimData?.pilots.reduce((collection: FeatureCollection<Point, Pilot>, pilot) => {
            if (!pilot.longitude || !pilot.latitude || !pilot.altitude)
                return collection;

            collection.features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [pilot.longitude, pilot.latitude, pilot.altitude]
                },
                properties: pilot
            });

            return collection;
        }, {
            type: 'FeatureCollection',
            features: []
        }), [vatsimData]);

    useEffect(() => {
        if (!skipToken) {
            // setTransceiverData([]);
            setVatsimData(undefined);
            return;
        };

        const controller = new AbortController();

        const options = { signal: controller.signal };

        const timer = setInterval(() => {
            fetch('https://data.vatsim.net/v3/vatsim-data.json', options)
            .then(res => res.json())
            .then(setVatsimData)
            .catch(console.error);

            // fetch('https://data.vatsim.net/v3/transceivers-data.json', options)
            //     .then(res => res.json())
            //     .then(setTransceiverData)
            //     .catch(console.error);
        }, interval);
        

        return () => {
            controller.abort();
            clearInterval(timer);
        };
    }, [skipToken, interval]);

    return { vatsimFeatures, skipToken, setSkipToken };
}