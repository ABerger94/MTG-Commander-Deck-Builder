export interface ScryfallImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  image_uris?: ScryfallImageUris;
}

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  legalities: {
    commander: 'legal' | 'not_legal' | 'banned' | 'restricted';
  };
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';
  set_name: string;
  set: string;
  prices: {
    usd?: string;
    usd_foil?: string;
  };
  keywords?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
}

export interface DeckCard {
  card: ScryfallCard;
  quantity: number;
}

export interface SavedDeck {
  id: string;
  name: string;
  commander: ScryfallCard | null;
  cards: DeckCard[];
  updatedAt: number;
}

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  set_type: string;
  released_at: string | null;
  card_count: number;
  icon_svg_uri: string;
  search_uri: string;
}

/* ---------- AI Deck Briefing (Commander Deck Assistant) ---------- */

export interface BriefingPillar {
  name: string;
  explanation: string;
  expansionCards: string[];
}

export interface BriefingDeckPlan {
  primaryGamePlan: string;
  mechanicalPillars: BriefingPillar[];
  themesToAvoid: string[];
  deckRatios: {
    creatures: number;
    spells: number;
    manaBase: number;
    interaction: number;
    cardAdvantage: number;
  };
}

export interface CardSuggestion {
  name: string;
  role: string;
  rationale: string;
  pillar: string;
  imageSmall: string | null;
  imageNormal: string | null;
  verified: boolean;
  /** Original LLM-provided name when Scryfall autocorrected it. */
  correctedFrom?: string;
  tcgplayerId: number | null;
  scryfallUsd: string | null;
  scryfallUri?: string;
}

export interface BriefingSuggestions {
  ramp: CardSuggestion[];
  draw: CardSuggestion[];
  removal: CardSuggestion[];
  wincons: CardSuggestion[];
  synergies: CardSuggestion[];
  creatures: CardSuggestion[];
  manaBase: CardSuggestion[];
  upgrades: CardSuggestion[];
  cardsToConsider: CardSuggestion[];
}

export interface WinLine {
  title: string;
  explanation: string;
  steps: string[];
  keyCards: CardSuggestion[];
}

export interface Briefing {
  commanderName: string;
  partnerName?: string | null;
  notes?: string;
  deckPlan: BriefingDeckPlan;
  suggestions: BriefingSuggestions;
  winconStrategies: WinLine[];
  considerationsAndCautions: string;
  generatedAt: number;
}

export interface SavedBriefing {
  id: string;
  commanderName: string;
  createdAt: number;
  briefing: Briefing;
}

export interface StarredCard {
  id: string;
  name: string;
  imageSmall: string | null;
  imageNormal: string | null;
  starredAt: number;
}
