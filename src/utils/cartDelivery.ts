import { CartItem } from '../services/cartApi';
import { ShopProduct, ShopWithOffers } from '../types/shop';
import { parsePriceAmount } from './shopDelivery';

export type CartDeliveryTarget = {
  shop: ShopWithOffers;
  product: ShopProduct;
  merchantId: string;
  productId: string;
  quantity: number;
  itemPrice: number;
};

/** Map a cart line into shop/product shapes used by Request Delivery screens. */
export const cartItemToDeliveryTarget = (item: CartItem): CartDeliveryTarget | null => {
  const merchantId = item.merchantId?.trim() || '';
  const productId = item.productId?.trim() || '';
  if (!merchantId || !productId) {
    return null;
  }

  const shopName = item.merchantName?.trim() || item.shopName?.trim() || 'Merchant';
  const unit =
    item.unitPrice != null && Number.isFinite(item.unitPrice)
      ? item.unitPrice
      : parsePriceAmount(item.price);
  const quantity = Math.max(1, item.quantity || 1);
  const itemPrice =
    item.itemTotal != null && Number.isFinite(item.itemTotal)
      ? item.itemTotal
      : unit * quantity;

  const shop: ShopWithOffers = {
    id: merchantId,
    name: shopName,
    merchantId,
    merchantName: shopName,
    offers: [],
  };

  const product: ShopProduct = {
    id: productId,
    shopId: merchantId,
    title: item.productName?.trim() || 'Item',
    price:
      item.price?.trim() ||
      (Number.isFinite(unit) ? `₹${Math.round(unit).toLocaleString('en-IN')}` : undefined),
    image: item.image,
    shopName,
  };

  return {
    shop,
    product,
    merchantId,
    productId,
    quantity,
    itemPrice: Math.max(0, itemPrice),
  };
};
