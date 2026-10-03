/** When people can book. Times are Brisbane local time (business.timeZone). */
export type WindowId = 'morning' | 'afternoon';

export interface BookingWindow {
  id: WindowId;
  label: string;
  /** Shown in messages: "8–10am". */
  arrive: string;
  start: string;
  end: string;
}

export interface BookingConfig {
  /** Days with no cleans: 0 = Sunday … 6 = Saturday. */
  daysOff: number[];
  /** Earliest day, counted from today. */
  leadDays: number;
  /** Latest day, counted from today. */
  horizonDays: number;
  windows: BookingWindow[];
}

export const booking: BookingConfig = {
  daysOff: [0],
  leadDays: 2,
  horizonDays: 14,
  windows: [
    { id: 'morning', label: 'Morning, arrive 8–10am', arrive: '8–10am', start: '08:00', end: '10:00' },
    { id: 'afternoon', label: 'Afternoon, arrive 12–2pm', arrive: '12–2pm', start: '12:00', end: '14:00' },
  ],
};
