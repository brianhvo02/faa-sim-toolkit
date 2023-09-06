import { useEffect, useState } from 'react';

interface IPLocationResponse {
    status: string;
    country: string;
    countryCode: string;
    region: string;
    regionName: string;
    city: string;
    zip: string;
    lat: number;
    lon: number;
    timezone: string;
    isp: string;
    org: string;
    as: string;
    query: string;
  }

export const useIPLocation = () => {
    const [location, setLocation] = useState<IPLocationResponse>();
    
    useEffect(() => {
        const controller = new AbortController();
        fetch('http://ip-api.com/json', { signal: controller.signal })
            .then(res => res.json())
            .then(setLocation)
            .catch(console.error);

        return () => controller.abort();
    }, []);
    
    return location;
}