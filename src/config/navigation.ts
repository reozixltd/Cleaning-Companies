/** Header and footer links. */
export interface NavLink {
  label: string;
  href: string;
}

export const navigation = {
  header: [
    { label: 'Services', href: '/services/' },
    { label: 'Prices', href: '/prices/' },
    { label: 'Areas', href: '/areas/' },
    { label: 'Offices', href: '/offices/' },
    { label: 'About', href: '/about/' },
  ] satisfies NavLink[],
  footer: [
    {
      title: 'Cleaning',
      links: [
        { label: 'Regular cleaning', href: '/services/regular/' },
        { label: 'Deep cleaning', href: '/services/deep/' },
        { label: 'End of lease cleaning', href: '/services/end-of-lease/' },
        { label: 'Move-in cleaning', href: '/services/move-in/' },
        { label: 'Office cleaning', href: '/offices/' },
      ],
    },
    {
      title: 'Clearday',
      links: [
        { label: 'About us', href: '/about/' },
        { label: 'Prices', href: '/prices/' },
        { label: 'Questions', href: '/faq/' },
        { label: 'Refer a friend', href: '/refer/' },
        { label: 'Careers', href: '/careers/' },
      ],
    },
    {
      title: 'Policies',
      links: [
        { label: 'Service terms', href: '/terms/' },
        { label: 'Privacy', href: '/privacy/' },
        { label: 'Accessibility', href: '/accessibility/' },
      ],
    },
  ],
};
