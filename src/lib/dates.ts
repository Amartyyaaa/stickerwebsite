/** Dates in Indian time, whatever time zone the server runs in. Times are Unix seconds. */
const IST = 'Asia/Kolkata';

export const formatDate = (sec: number) => new Date(sec * 1000).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (sec: number) =>
  new Date(sec * 1000).toLocaleString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
