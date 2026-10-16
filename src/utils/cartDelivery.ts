import { CartItem } from '../services/cartApi';
import { ShopProduct, ShopWithOffers } from '../types/shop';
import { formatRupeeAmount, resolveProductPriceQuote } from './productPrice';

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
  const shopId = item.shopId?.trim() || merchantId;
  const quote = resolveProductPriceQuote({
    discountedPrice: item.unitPrice,
    saleAmount: item.unitPrice,
    originalAmount: item.originalUnitPrice,
    originalPrice: item.originalUnitPrice,
  });
  const quantity = Math.max(1, item.quantity || 1);
  const itemPrice = quote.saleAmount * quantity;

  const shop: ShopWithOffers = {
    id: shopId,
    name: shopName,
    merchantId,
    merchantName: shopName,
    offers: [],
  };

  const product: ShopProduct = {
    id: productId,
    shopId,
    title: item.productName?.trim() || 'Item',
    price: formatRupeeAmount(quote.saleAmount),
    originalPrice:
      quote.originalAmount != null ? formatRupeeAmount(quote.originalAmount) : undefined,
    priceAmount: quote.saleAmount,
    originalPriceAmount: quote.originalAmount,
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
