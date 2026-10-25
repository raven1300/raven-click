// Features shown in the site header and as cards on the landing page.
// To add a feature, add an entry here.
export const features = [
  {
    name: 'Recipes',
    href: '/recipes/',
    blurb: 'Browse recipes, build a list and get a shopping list.',
  },
  {
    name: 'Training',
    href: '/training/',
    blurb: 'Log your gym sessions and track your progress.',
  },
];

// Header links, in order.
export const navLinks = [
  { name: 'About', href: '/about/' },
  ...features,
];
