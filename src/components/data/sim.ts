export interface SimData<T, D> {
    type: T;
    data: D;
}

export type SimPayload = SimData<'position' | 'radar', PositionData | RadarData>;
export type PositionPayload = SimData<'position', PositionData>;
export type RadarPayload = SimData<'radar', RadarData>;

export const isPositionData = (payload: SimPayload): payload is PositionPayload => 
    payload.type === 'position';

export const isRadarData = (payload: SimPayload): payload is RadarPayload => 
    payload.type === 'radar';

export interface PositionData {
    longitude: number;
    latitude: number;
    altitudeMSL: number;
    altitudeAGL: number;
    pitch: number;
    yaw: number;
    roll: number;
    speed: number;
    vx: number;
    vy: number;
    vz: number;
    p: number;
    q: number;
    r: number;
}

export interface RadarData {
    longitude: number;
    latitude: number;
    bases: number;
    tops: number;
    clouds: number;
    precip: number;
}