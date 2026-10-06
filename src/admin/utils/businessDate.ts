const tehranDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function tehranBusinessDate(value: Date): string {
  const parts = tehranDateFormatter.formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function shiftBusinessDateInTehran(value: Date, days: number): string {
  const [year, month, day] = tehranBusinessDate(value).split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return tehranBusinessDate(shifted);
}
