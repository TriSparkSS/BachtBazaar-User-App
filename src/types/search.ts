import { ShopOffer, ShopProduct, ShopWithOffers } from './shop';

export interface SearchResults {
  query: string;
  totalShopsFound: number;
  totalProductsFound: number;
  totalServicesFound: number;
  shops: ShopWithOffers[];
  products: ShopProduct[];
  services: ShopProduct[];
  offers: ShopOffer[];
}
