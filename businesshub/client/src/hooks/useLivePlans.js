import { useEffect, useState } from 'react';
import { helpService } from '../services/helpService';

// Plans as the server actually enforces them (limits and prices come from the
// same settings that gate features). Callers keep a built-in fallback, so a
// failed request never leaves the pricing blank.
export default function useLivePlans() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    helpService.plans().then((d) => { if (!cancelled) setData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return data; // { plans: [{ id, name, priceLabel, periodDays, features }], trialDays, periodDays } or null
}
