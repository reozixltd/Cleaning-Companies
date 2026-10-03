/** 24×24 outline icons, drawn with a 1.75 stroke. Add a path here to add an icon. */
export const icons = {
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5L20 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3',
  key: 'M14.5 3a6.5 6.5 0 1 1-4.9 10.8L3 20.5V17h3v-3h3l1.1-1.1A6.5 6.5 0 0 1 14.5 3zM16 8h.01',
  'map-pin': 'M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  building: 'M4 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M16 9h3a1 1 0 0 1 1 1v11M2 21h20M8 8h4M8 12h4M8 16h4',
  calendar: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 10h16M8 3v4M16 3v4',
  'chevron-down': 'M6 9l6 6 6-6',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  copy: 'M9 9h10v10H9zM5 15V5h10',
} as const;

export type IconName = keyof typeof icons;
