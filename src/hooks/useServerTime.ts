import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

let globalTimeOffset = 0;
let hasFetchedOffset = false;

export function useServerTime() {
    const [now, setNow] = useState(new Date(Date.now() + globalTimeOffset));

    useEffect(() => {
        const fetchTime = async () => {
            if (!hasFetchedOffset) {
                try {
                    const res = await fetch(`${API_URL}/api/health`, { method: 'HEAD' });
                    const dateHeader = res.headers.get('Date');
                    if (dateHeader) {
                        const serverTime = new Date(dateHeader).getTime();
                        globalTimeOffset = serverTime - Date.now();
                        hasFetchedOffset = true;
                    }
                } catch (e) {
                    console.error("Failed to fetch server time", e);
                }
            }
        };
        fetchTime();

        const interval = setInterval(() => {
            setNow(new Date(Date.now() + globalTimeOffset));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return now;
}
