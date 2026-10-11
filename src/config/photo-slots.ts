/**
 * Every photo the site uses, by slot. To fill a slot, save an image as
 * src/assets/photos/<slot>.jpg (or .png/.webp/.avif). Missing files show a
 * labelled placeholder. Pictures of people follow docs/photo-credits.md: in the demo they
 * are generated illustrations marked "Sample photo"; a live client uses real photographs.
 * The home hero uses `hero` as a backdrop behind its headline card, and `hero-portrait` on phones.
 */
export interface PhotoSlot {
  alt: string;
  brief: string;
  search: string;
  orientation: 'landscape' | 'portrait' | 'square';
}

export const photoSlots = {
  hero: { alt: 'A bright open-plan living room and kitchen in morning light', brief: 'Wide interior of a just-cleaned open-plan living room and kitchen in morning light. Keep the left 40% calm: the headline card sits there. 2880×1620.', search: '(generated: prompt G0 in docs/superpowers/specs/2026-10-10-cinematic-3d-redesign-design.md)', orientation: 'landscape' },
  'hero-portrait': { alt: 'A sunlit kitchen island in a clean home', brief: 'The same home as `hero`, framed upright for phones: island and sunlit window in the top two thirds. 1440×2560.', search: '(generated: prompt G2 in the same spec)', orientation: 'portrait' },
  'service-regular': { alt: 'A made bed in a bright bedroom', brief: 'A bedroom after a regular clean: made bed, clear surfaces.', search: 'tidy bedroom natural light', orientation: 'landscape' },
  'service-deep': { alt: 'A clean basin and tapware against dark bathroom tiles', brief: 'A bathroom with spotless tiles, glass and tapware.', search: 'clean bathroom tiles glass shower', orientation: 'landscape' },
  'service-end-of-lease': { alt: 'An empty, clean apartment ready for inspection', brief: 'An empty rental after a bond clean: bare floors, clean windows.', search: 'empty clean apartment bright', orientation: 'landscape' },
  'service-move-in': { alt: 'A clean, bright kitchen ready for a new household', brief: 'An empty kitchen with clean benches and cupboards.', search: 'empty clean kitchen', orientation: 'landscape' },
  'area-chermside': { alt: 'The atrium at Westfield Chermside', brief: 'A residential street in Chermside or similar Brisbane north suburb.', search: 'Brisbane suburb street', orientation: 'landscape' },
  'area-aspley': { alt: 'Gympie Road in Aspley under a blue sky', brief: 'Homes in Aspley.', search: 'Brisbane house street', orientation: 'landscape' },
  'area-albany-creek': { alt: 'Albany Creek Road and the local shops in Albany Creek', brief: 'A street in Albany Creek.', search: 'Queensland suburban street', orientation: 'landscape' },
  'area-everton-park': { alt: 'Everton Park Library on South Pine Road', brief: 'Townhouses in Everton Park.', search: 'Brisbane townhouses', orientation: 'landscape' },
  founder: { alt: 'Founder of the business', brief: 'Demo: a generated portrait, marked "Sample photo" on the page. Live client: the real founder, half-length, approachable. 4:5.', search: '(demo: prompt T1 in the redesign spec; live: the client\'s own photo)', orientation: 'portrait' },
  offices: { alt: 'A clean, empty meeting room with a long table', brief: 'An open-plan office after hours, clean desks and floor.', search: 'clean empty office', orientation: 'landscape' },
  'room-kitchen-before': { alt: 'The kitchen before a clean: a crumpled tea towel and crumbs on the bench after an ordinary week', brief: 'The kitchen in an ordinary lived-in week, never filthy. Same camera position as the "after" still. 1920×1080.', search: '(generated: prompt G3 in the redesign spec)', orientation: 'landscape' },
  'room-kitchen-after': { alt: 'The same kitchen after a clean: a clear bench, a folded tea towel and a shining cooktop', brief: 'The same kitchen, same camera position, after a clean. 1920×1080.', search: '(generated: prompt G3 in the redesign spec)', orientation: 'landscape' },
  'room-bath-before': { alt: 'The bathroom before a clean: smudged glass and mirror and a crumpled towel on the rail', brief: 'The bathroom in an ordinary lived-in week. Same camera position as the "after" still. 1920×1080.', search: '(generated: prompt G4 in the redesign spec)', orientation: 'landscape' },
  'room-bath-after': { alt: 'The same bathroom after a clean: clear glass, a bright mirror and a neatly hung towel', brief: 'The same bathroom, same camera position, after a clean. 1920×1080.', search: '(generated: prompt G4 in the redesign spec)', orientation: 'landscape' },
  'room-living-before': { alt: 'The living room before a clean: rumpled cushions on the sofa and a cup and magazine on the coffee table', brief: 'The living room in an ordinary lived-in week. 1920×1080.', search: '(generated: prompt G5 in the redesign spec)', orientation: 'landscape' },
  'room-living-after': { alt: 'The living room after a clean: plumped cushions on the sofa and a tidy coffee table', brief: 'The living room after a clean. If it is not from the same camera position as the "before" still, the stage fades between them instead of sweeping. 1920×1080.', search: '(generated: prompt G5 in the redesign spec)', orientation: 'landscape' },
  'room-bed-before': { alt: 'The bedroom before a clean: an unmade bed with a rumpled duvet and loose pillows', brief: 'The bedroom in an ordinary lived-in week. Same camera position as the "after" still. 1920×1080.', search: '(generated: prompt G6 in the redesign spec)', orientation: 'landscape' },
  'room-bed-after': { alt: 'The same bedroom after a clean: a made bed with a smooth duvet and neat pillows', brief: 'The same bedroom, same camera position, after a clean. 1920×1080.', search: '(generated: prompt G6 in the redesign spec)', orientation: 'landscape' },
  'action-kitchen': { alt: 'The kitchen bench before a clean', brief: 'The first frame of the kitchen clip (public/media/action-kitchen.*): its poster on screens 768px and wider. 1920×1080.', search: '(first frame of clip C1 in the redesign spec)', orientation: 'landscape' },
  'action-kitchen-still': { alt: 'A cleaner in a charcoal apron wiping down the kitchen bench', brief: 'A frame from the middle of the kitchen clip with the cleaner at work: what phones show instead of the clip. 1920×1080.', search: '(frame at 4 s of clip C1 in the redesign spec)', orientation: 'landscape' },
  team: { alt: 'Two cleaners in charcoal aprons arriving at a Queenslander home with their caddy and vacuum', brief: 'Demo: a generated picture of cleaners arriving, marked "Sample photo" on the page. Live client: the real team, with their permission. Plain clothing, no logo. 3:2.', search: '(demo: prompt T2 in the redesign spec; live: the client\'s own photo)', orientation: 'landscape' },
  closing: { alt: 'The open-plan kitchen and living area in late afternoon light, with the door open to the garden', brief: 'The home from `hero` later in the day, as the backdrop of the closing band. The card sits on the left. 2400×1350.', search: '(generated: prompt G7 in the redesign spec)', orientation: 'landscape' },
} satisfies Record<string, PhotoSlot>;

export type PhotoSlotName = keyof typeof photoSlots;
