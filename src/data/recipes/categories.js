// Ingredients that match are silently dropped from the shopping list
export const ignore = [
  "water",
  "boiling water",
  "salt",
  "pepper",
  "black pepper",
  "white pepper",
];

export const categories = {
  "vegetables": {
    keywords: [
      "onion", "tomato", "carrot", "celery", "spinach", "courgette",
      "corn", "broccoli", "capsicum", "zucchini", "cauliflower", "cabbage",
      "lettuce", "potato", "squash", "kale", "scallion", "shallot", "green bean",
      "jalapeño", "jalapeno", "green chile", "pineapple", "leaves", "cucumber",
    ],
    exclude: ["tomato paste", "tomato puree", "tomato sauce", "tinned tomatoes", "mixed vegetables",
      "frozen", "canned crushed tomatoes", "cornstarch", "tin of tomatoes", "onion powder", "curry leaves"],
  },
  "meats": {
    keywords: [
      "pancetta", "chicken", "beef", "lamb", "salmon", "bacon", "mince",
      "turkey", "pork", "sausage", "shrimp", "prawn", "anchovy", "salami", "chuck steak",
    ],
    exclude: ["chicken stock", "beef stock", "fish sauce", "chicken broth", "finely minced", "bone broth", "minced"],
  },
  "dairy": {
    keywords: [
      "parmesan", "cream", "butter", "milk", "egg whites", "cheese", "cheddar",
      "eggs", "yoghurt", "feta", "chorizo", "yogurt", "ricotta",
      "egg yolks", "mozzarella", "egg",
    ],
    exclude: ["peanut butter", "coconut milk"],
  },
  "pasta & grains": {
    keywords: [
      "spaghetti", "pasta", "rice", "flour", "breadcrumbs",
      "orzo", "risoni", "quinoa", "tortilla", "roll",
    ],
    exclude: [],
  },
  "tins": {
    keywords: [
      "tinned tomatoes", "chickpeas", "lentils", "coconut milk", "curry paste", "tin",
      "kidney bean", "black bean", "refried bean", "white bean", "crushed tomatoes",
    ],
    exclude: [],
  },
  "herbs & spices": {
    keywords: [
      "chilli", "cumin", "oregano", "basil", "thyme", "paprika", "coriander",
      "stock", "seasoning", "lime", "lemon",
      "turmeric", "garam masala", "curry powder", "cayenne", "chili powder",
      "cardamom", "cinnamon", "star anise", "bay", "ginger", "galangal",
      "lemongrass", "fennel", "sage", "parsley", "cilantro", "chives",
      "tamarind", "sesame seed", "mustard seed", "broth", "garlic", "garlic powder", "nutmeg", "clove powder",
      "mixed herbs", "cornstarch", "recipe base", "curry leaves",
    ],
    exclude: [],
  },
  "sauces & oils": {
    keywords: [
      "olive oil", "oil", "vinegar", "soy sauce", "fish sauce", "tomato sauce",
      "ketchup", "bbq sauce", "oyster sauce", "worcestershire", "sriracha",
      "hot sauce", "tamari", "kecap manis", "mirin", "cooking wine",
      "mustard", "tahini", "wine", "miso", "marinara", "pizza sauce", "enchilada sauce",
      "mayo", "mayonnaise",
      "tomato paste", "tomato puree", "passata", "peanut butter",
    ],
    exclude: [],
  },
  "frozen": {
    keywords: ["berries", "mixed vegetables", "peas", "frozen", "edamame"],
    exclude: [],
  },
  "sweeteners": {
    keywords: ["honey", "maple syrup", "sugar", "coconut"],
    exclude: ["coconut milk", "coconut oil"],
  },
  "other": {
    keywords: [],
    exclude: [],
  },
};

function categorise(ingredient) {
  const lower = ingredient.toLowerCase()
    .replace(/,\s*for\s+\w+.*$/, '')
    .replace(/\s+(to taste|to serve|as needed|as desired).*$/i, '');
  for (const [category, { keywords, exclude }] of Object.entries(categories)) {
    if (exclude.some(ex => lower.includes(ex))) continue;
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'other';
}

export function buildShoppingList(selectedRecipes) {
  const grouped = {};

  for (const recipe of selectedRecipes) {
    for (const ingredient of recipe.ingredients) {
      const lower = ingredient.toLowerCase();
      const stripped = lower
        .replace(/^(?:[\d\s¼½¾⅓⅔⅛\/\.]+)?(?:tsp|tbsp|teaspoon|tablespoon|cup|g|ml|oz|lb|kg|pinch|dash|handful|bunch|sprig|clove|can|jar|slice|piece)s?\s+(?:of\s+)?/i, '')
        .replace(/\s+(to taste|to serve|as needed|as desired).*$/i, '')
        .trim();
      if (ignore.some(ig => stripped === ig)) continue;
      const category = categorise(ingredient);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(`${ingredient} (${recipe.shortName})`);
    }
  }

  const order = ["vegetables", "meats", "dairy", "pasta & grains", "tins", "herbs & spices", "sauces & oils", "frozen", "sweeteners", "other"];
  return order
    .filter(cat => grouped[cat]?.length)
    .map(cat => `${cat.toUpperCase()}\n${grouped[cat].sort().join('\n')}`)
    .join('\n\n');
}
