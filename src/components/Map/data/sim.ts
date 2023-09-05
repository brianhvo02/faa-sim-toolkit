export interface XData {
    header: 'XGPS' | 'XATT' | 'XTRA';
    data: XGPSData | XATTData | XTRAData;
}

export const isXGPS = (payload: XData): payload is XGPS => payload.header === 'XGPS';
export const isXATT = (payload: XData): payload is XATT => payload.header === 'XATT';
export const isXTRA = (payload: XData): payload is XTRA => payload.header === 'XTRA';

export interface XGPS {
    header: 'XGPS';
    data: XGPSData;
}

export interface XATT {
    header: 'XATT';
    data: XATTData;
}

export interface XTRA {
    header: 'XTRA';
    data: XTRAData;
}

export interface XGPSData {
    longitude: number;
    latitude: number;
    elevation: number;
    bearing: number;
    speed: number;
}

export interface XATTData {
    yaw: number;
    pitch: number;
    roll: number;
    p: number;
    q: number;
    r: number;
    speed_east: number;
    speed_up: number;
    speed_south: number;
    gload_side: number;
    gload_normal: number;
    gload_axial: number;
}

export interface XTRAData {
    index: number;
    latitude: number;
    longitude: number;
    elevation: number;
    vertical_speed: number;
    ground: number;
    heading: number;
    speed: number;
    tail_number: number;
}