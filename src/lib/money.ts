/** Format an amount in paise as Indian rupees, for example 149900 → "₹1,499". */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

export const rupees = (r: number): number => Math.round(r * 100);
