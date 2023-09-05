import { useEffect, useState } from 'react';

interface Briefing {
    general: {
        release: string;
        icao_airline: string;
        flight_number: string;
        is_etops: string;
        dx_rmk: string;
        sys_rmk: {};
        is_detailed_profile: string;
        cruise_profile: string;
        climb_profile: string;
        descent_profile: string;
        alternate_profile: string;
        reserve_profile: string;
        costindex: string;
        cont_rule: string;
        initial_altitude: string;
        stepclimb_string: string;
        avg_temp_dev: string;
        avg_tropopause: string;
        avg_wind_comp: string;
        avg_wind_dir: string;
        avg_wind_spd: string;
        gc_distance: string;
        route_distance: string;
        air_distance: string;
        total_burn: string;
        cruise_tas: string;
        cruise_mach: string;
        passengers: string;
        route: string;
        route_ifps: string;
        route_navigraph: string;
    }
    aircraft: {
        base_type: string;
        equip: string;
        fin: string;
        fuelfact: string;
        fuelfactor: string;
        iata_code: string;
        iatacode: string;
        icao_code: string;
        icaocode: string;
        internal_id: string;
        is_custom: string;
        max_passengers: string;
        name: string;
        reg: string;
        selcal: string;
    }
    atc: {
        flightplan_text: string;
        route: string;
        route_ifps: string;
        callsign: string;
        initial_spd: string;
        initial_spd_unit: string;
        initial_alt: string;
        initial_alt_unit: string;
        section18: string;
        fir_orig: string;
        fir_dest: string;
        fir_altn: string;
        fir_etops: {};
        fir_enroute: string;
    }
    origin: Airport;
    destination: Airport;
}

interface Airport {
    icao_code: string;
    iata_code: string;
    faa_code: {};
    elevation: string;
    pos_lat: string;
    pos_long: string;
    name: string;
    timezone: string;
    plan_rwy: string;
    trans_alt: string;
    trans_level: string;
    metar: string;
    metar_time: string;
    metar_category: string;
    metar_visibility: string;
    metar_ceiling: string;
    taf: string;
    taf_time: string;
    atis: ATIS[],
    notam: NOTAM[]
}

interface ATIS {
    network: string;
    issued: string;
    letter: string;
    phonetic: string;
    type: string;
    message: string;
}

interface NOTAM {
    source_id: string;
    account_id: string;
    notam_id: string;
    location_id: string;
    location_icao: string;
    location_name: string;
    location_type: string;
    date_created: string;
    date_effective: string;
    date_expire: string;
    date_expire_is_estimated: {};
    date_modified: string;
    notam_schedule: {};
    notam_html: string;
    notam_text: string;
    notam_raw: string;
    notam_nrc: string;
    notam_qcode: string;
    notam_qcode_category: string;
    notam_qcode_subject: string;
    notam_qcode_status: string;
    notam_is_obstacle: {};
}

export const useSimbrief = () => {
    const [simbriefUsername, setSimbriefUsername] = useState<string>();
    const [briefing, setBriefing] = useState<Briefing>();
    
    useEffect(() => {
        if (simbriefUsername) {
            const controller = new AbortController();
            fetch(`https://www.simbrief.com/api/xml.fetcher.php?username=${simbriefUsername}&json=1`, { signal: controller.signal })
                .then(res => res.json())
                .then(setBriefing)
                .catch(console.error);
    
            return () => controller.abort();
        }
    }, [simbriefUsername]);
    
    return { briefing, setSimbriefUsername };
}