/**
 * Every photo the site uses, by slot. To fill a slot, save an image as
 * src/assets/photos/<slot>.jpg (or .png/.webp/.avif). Missing files show a
 * labelled placeholder. Photos show finished rooms; never present stock people as staff.
 * The home page has no hero photo on purpose: the floor plan is the hero.
 */
export interface PhotoSlot {
  alt: string;
  brief: string;
  search: string;
  orientation: 'landscape' | 'portrait' | 'square';
}

export const photoSlots = {
  'service-regular': { alt: 'A made bed in a bright bedroom', brief: 'A bedroom after a regular clean: made bed, clear surfaces.', search: 'tidy bedroom natural light', orientation: 'landscape' },
  'service-deep': { alt: 'A clean basin and tapware against dark bathroom tiles', brief: 'A bathroom with spotless tiles, glass and tapware.', search: 'clean bathroom tiles glass shower', orientation: 'landscape' },
  'service-end-of-lease': { alt: 'An empty, clean apartment ready for inspection', brief: 'An empty rental after a bond clean: bare floors, clean windows.', search: 'empty clean apartment bright', orientation: 'landscape' },
  'service-move-in': { alt: 'A clean, bright kitchen ready for a new household', brief: 'An empty kitchen with clean benches and cupboards.', search: 'empty clean kitchen', orientation: 'landscape' },
  'area-chermside': { alt: 'The atrium at Westfield Chermside', brief: 'A residential street in Chermside or similar Brisbane north suburb.', search: 'Brisbane suburb street', orientation: 'landscape' },
  'area-aspley': { alt: 'Gympie Road in Aspley under a blue sky', brief: 'Homes in Aspley.', search: 'Brisbane house street', orientation: 'landscape' },
  'area-albany-creek': { alt: 'Albany Creek Road and the local shops in Albany Creek', brief: 'A street in Albany Creek.', search: 'Queensland suburban street', orientation: 'landscape' },
  'area-everton-park': { alt: 'Everton Park Library on South Pine Road', brief: 'Townhouses in Everton Park.', search: 'Brisbane townhouses', orientation: 'landscape' },
  founder: { alt: 'Founder of the business', brief: 'The real founder, half-length, approachable. Must be the real person for a live client.', search: '(use the client\'s own photo)', orientation: 'portrait' },
  offices: { alt: 'A clean, empty meeting room with a long table', brief: 'An open-plan office after hours, clean desks and floor.', search: 'clean empty office', orientation: 'landscape' },
} satisfies Record<string, PhotoSlot>;

export type PhotoSlotName = keyof typeof photoSlots;
