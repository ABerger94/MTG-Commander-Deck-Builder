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
