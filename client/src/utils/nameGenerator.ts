// Beautiful name generator for Safe wallets
// Combines adjectives with nouns to create memorable wallet names

const ADJECTIVES = [
  // Colors
  'Azure', 'Crimson', 'Golden', 'Silver', 'Emerald', 'Sapphire', 'Ruby', 'Pearl',
  'Violet', 'Amber', 'Coral', 'Jade', 'Onyx', 'Ivory', 'Copper', 'Platinum',
  
  // Nature
  'Serene', 'Mystic', 'Radiant', 'Luminous', 'Ethereal', 'Celestial', 'Stellar',
  'Aurora', 'Cosmic', 'Nebula', 'Solar', 'Lunar', 'Astral', 'Galactic',
  
  // Qualities
  'Noble', 'Majestic', 'Elegant', 'Graceful', 'Brilliant', 'Pristine', 'Supreme',
  'Divine', 'Infinite', 'Eternal', 'Legendary', 'Epic', 'Heroic', 'Mighty',
  
  // Elements
  'Crystal', 'Diamond', 'Titanium', 'Quantum', 'Prism', 'Phoenix', 'Thunder',
  'Lightning', 'Storm', 'Frost', 'Flame', 'Ocean', 'Mountain', 'Forest'
];

const NOUNS = [
  // Guardians & Protectors
  'Guardian', 'Sentinel', 'Keeper', 'Protector', 'Defender', 'Shield', 'Fortress',
  'Bastion', 'Citadel', 'Sanctuary', 'Haven', 'Refuge', 'Vault', 'Treasury',
  
  // Mythical & Legendary
  'Phoenix', 'Dragon', 'Griffin', 'Unicorn', 'Pegasus', 'Sphinx', 'Kraken',
  'Leviathan', 'Titan', 'Colossus', 'Behemoth', 'Chimera', 'Hydra', 'Minotaur',
  
  // Celestial
  'Star', 'Constellation', 'Galaxy', 'Nebula', 'Comet', 'Meteor', 'Supernova',
  'Quasar', 'Pulsar', 'Eclipse', 'Aurora', 'Cosmos', 'Universe', 'Infinity',
  
  // Treasures & Artifacts
  'Crown', 'Scepter', 'Orb', 'Chalice', 'Relic', 'Artifact', 'Talisman',
  'Amulet', 'Medallion', 'Sigil', 'Emblem', 'Crest', 'Seal', 'Token',
  
  // Abstract Concepts
  'Legacy', 'Dynasty', 'Empire', 'Kingdom', 'Realm', 'Domain', 'Horizon',
  'Destiny', 'Fortune', 'Prosperity', 'Victory', 'Triumph', 'Glory', 'Honor'
];

/**
 * Generates a beautiful random name for a Safe wallet
 * @returns A string in the format "Adjective Noun" (e.g., "Golden Guardian")
 */
export function generateRandomWalletName(): string {
  const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  
  return `${randomAdjective} ${randomNoun}`;
}

/**
 * Generates multiple unique random names
 * @param count Number of names to generate
 * @returns Array of unique wallet names
 */
export function generateMultipleWalletNames(count: number): string[] {
  const names = new Set<string>();
  
  while (names.size < count && names.size < ADJECTIVES.length * NOUNS.length) {
    names.add(generateRandomWalletName());
  }
  
  return Array.from(names);
}

/**
 * Validates if a name follows the beautiful naming pattern
 * @param name The name to validate
 * @returns True if the name matches the pattern
 */
export function isGeneratedName(name: string): boolean {
  const parts = name.split(' ');
  if (parts.length !== 2) return false;
  
  const [adjective, noun] = parts;
  return ADJECTIVES.includes(adjective) && NOUNS.includes(noun);
}
