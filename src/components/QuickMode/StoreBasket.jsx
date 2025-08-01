import React, { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { removeFromCart } from "../../redux/actions/action";        
import { BsBasket } from "react-icons/bs";
import { LiaTimesSolid } from "react-icons/lia";
import { GoChevronRight } from "react-icons/go";
import IkImage from "../../services/IkImage";                      
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function StoreBasket({ vendorId, quickMode = false, onQuickFlow }) {
  /* pull ONLY this vendor’s cart products */
  const products = useSelector(
    (s) => s.cart?.[vendorId]?.products || {}
  );
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  const { items, itemCount, total } = useMemo(() => {
    const arr = Object.entries(products).map(([productKey, p]) => ({
      ...p,
      productKey,
    }));
    const count = arr.reduce((sum, p) => sum + p.quantity, 0);
    const tot   = arr.reduce((sum, p) => sum + p.price * p.quantity, 0);
    return { items: arr, itemCount: count, total: tot };
  }, [products]);

  /* ---------- helpers ---------- */
  const formatNaira = (n) =>
    `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

  const handleRemove = (key) => {
    dispatch(removeFromCart({ vendorId, productKey: key }));
    toast(`Removed item from cart`, { icon: "🗑️" });
  };

  const handleCheckout = () => {
    setOpen(false);
    if (quickMode) {
      /* stay on page → run condensed flow (Google > phone > pay) */
      onQuickFlow?.();
    } else {
      navigate(`/newcheckout/${vendorId}`);
    }
  };

  /* nothing in cart? don’t render anything */
  if (!itemCount) return null;

  return (
    <>
      {/* ─────────── FAB ─────────── */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-4 z-50 w-14 h-14 rounded-full
                   bg-customOrange text-white flex flex-col items-center
                   justify-center shadow-xl">
        <BsBasket size={22} />
        <span className="text-[10px] leading-none font-bold">
          {itemCount}
        </span>
      </button>

      {/* ─────────── Drawer ─────────── */}
      {open && (
        <>
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50
                       bg-white rounded-t-2xl shadow-lg
                       max-h-[80vh] flex flex-col
                       animate-[slideUp_0.25s_ease-out]"
            style={{ "--tw-animate-slideUp": "from{transform:translateY(100%)} to{transform:translateY(0)}" }}
          >
            {/* header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold font-opensans">
                Your Selection
              </h2>
              <button onClick={() => setOpen(false)}>
                <LiaTimesSolid className="text-2xl" />
              </button>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto px-4">
              {items.map((p) => (
                <div key={p.productKey} className="py-4 border-b last:border-0 flex">
                  {/* thumbnail */}
                  <div className="relative">
                    <IkImage
                      src={p.selectedImageUrl}
                      alt={p.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    {p.quantity > 1 && (
                      <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                        +{p.quantity}
                      </span>
                    )}
                  </div>

                  {/* details */}
                  <div className="flex-1 ml-4">
                    <p className="text-sm font-opensans truncate">{p.name}</p>
                    {p.isFashion && (
                      <p className="text-[11px] text-gray-600 mt-1">
                        Size: <span className="font-semibold">{p.selectedSize}</span>
                        {p.selectedColor && (
                          <>
                            {" • "}Color:{" "}
                            <span className="font-semibold capitalize">
                              {p.selectedColor.toLowerCase()}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                    <p className="text-sm font-bold mt-1">
                      {formatNaira(p.price * p.quantity)}
                    </p>
                  </div>

                  {/* remove */}
                  <button
                    onClick={() => handleRemove(p.productKey)}
                    className="text-xs text-gray-500 ml-2">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <span className="font-opensans font-medium">Total</span>
                <span className="font-bold">{formatNaira(total)}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full h-12 rounded-full bg-customOrange
                           text-white font-semibold flex items-center justify-center">
                {quickMode ? "Fast Checkout" : "Proceed to Checkout"}
                <GoChevronRight className="ml-1 text-lg" />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
