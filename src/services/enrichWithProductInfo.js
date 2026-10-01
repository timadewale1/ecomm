import {getOrderProductSnapshots} from "./orderProductSnapshots";
import {isVariantSizeHidden} from "./productVariantSelection";

export async function enrichWithProductInfo(rawOrders) {
  const products=await getOrderProductSnapshots(rawOrders,{source:"draftOrders"});
  return rawOrders.map(order=>({...order,cartItems:(order.cartItems || []).map((item,index)=>{
    const product=products[order.id]?.[index] || item.productSnapshot || {};
    const hidden=item.variantAttributes?.sizeHidden ?? item.sizeHidden;
    return {...item,
      name:item.name || item.productName || product.name || "Product",
      price:item.unitPrice ?? item.productSnapshot?.price ?? item.price ?? product.price,
      imageUrl:item.selectedImageUrl || item.imageUrl || item.image || product.imageUrl || product.coverImageUrl || product.imageUrls?.[0] || "",
      color:item.color || item.variantAttributes?.color || product.color || "",
      size:item.size || item.variantAttributes?.size || product.size || "",
      hideSize:typeof hidden==="boolean" ? hidden : isVariantSizeHidden(product),
    };
  })}));
}
