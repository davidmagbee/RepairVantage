import { createContext, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_TIME_ZONE, detectTimeZone, isTimeZone } from '../time/date-time';

export const TIME_ZONE_KEY = 'repairvantage:time-zone';
const TimeZoneContext = createContext<{ timeZone: string; setTimeZone: (value: string) => void }>({ timeZone: DEFAULT_TIME_ZONE, setTimeZone: () => {} });

/** Keep a browser preference without changing stored instants or inferring a user's location on the server. */
export function TimeZoneProvider({ children }: { children: ReactNode }) {
  const [timeZone, updateTimeZone] = useState(() => {
    try {
      const saved = localStorage.getItem(TIME_ZONE_KEY);
      if (saved && isTimeZone(saved)) return saved;
    } catch { /* Storage can be unavailable in private or restricted browser contexts. */ }
    return detectTimeZone();
  });
  function setTimeZone(value: string) {
    if (!isTimeZone(value)) return;
    updateTimeZone(value);
    try { localStorage.setItem(TIME_ZONE_KEY, value); } catch { /* The current session still uses the selected zone. */ }
  }
  return <TimeZoneContext.Provider value={{ timeZone, setTimeZone }}>{children}</TimeZoneContext.Provider>;
}

export function useTimeZone() { return useContext(TimeZoneContext); }
