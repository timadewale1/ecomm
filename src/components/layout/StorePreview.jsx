import React, { useContext, useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { FaStar } from "react-icons/fa";
import { LuPackageOpen } from "react-icons/lu";
import { VendorContext } from "../Context/Vendorcontext";
import "./store-celebration.css";

const FIGMA_ASSETS = "/figma-assets/vendor-store";

const BADGES = [
  { match: "og", label: "OG Seller", asset: "/OG.svg", ink: "#7a4d00" },
  { match: "power", label: "Power Seller", asset: "/Power.svg", ink: "#7b1515" },
  { match: "reliable", label: "Reliable Seller", asset: "/Reliable.svg", ink: "#1f5d46" },
  { match: "steady", label: "Steady Seller", asset: "/Speedy.svg", ink: "#164e63" },
  { match: "speedy", label: "Steady Seller", asset: "/Speedy.svg", ink: "#164e63" },
  { match: "consistent", label: "Consistent Seller", asset: "/Consistent.svg", ink: "#5b3a00" },
  { match: "rising", label: "Rising Seller", asset: "/Rising.svg", ink: "#7c3f00" },
];

const badgeFor = (value) => {
  const badgeName = String(value || "").trim().toLowerCase();
  return (
    BADGES.find(({ match }) => badgeName.includes(match)) || {
      label: "Newbie",
      asset: "/Newbie.svg",
      ink: "#377400",
    }
  );
};

const vendorImage = (vendor) =>
  vendor?.profileImageUrl || vendor?.photoURL || vendor?.coverImageUrl || "";

const availableItems = (vendor) => {
  const explicitCount = Number(
    vendor?.productCount ??
      vendor?.productsCount ??
      vendor?.itemsAvailable ??
      vendor?.totalProducts,
  );
  if (Number.isFinite(explicitCount) && explicitCount >= 0) return explicitCount;
  return Array.isArray(vendor?.productIds) ? vendor.productIds.length : 0;
};

export default function StorePagePreview() {
  const { vendorData: vendor } = useContext(VendorContext);
  const canvasRef = useRef(null);

  useEffect(() => {
    const ready =
      vendor?.walletSetup === true && vendor?.introcelebration === false;
    if (!ready || !canvasRef.current) return undefined;

    const fire = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });
    fire({ particleCount: 500, spread: 100, origin: { y: 0.7 } });

    return () => fire.reset();
  }, [vendor?.introcelebration, vendor?.walletSetup]);

  const badge = useMemo(() => badgeFor(vendor?.badge), [vendor?.badge]);
  const ratingCount = Number(vendor?.ratingCount || 0);
  const averageRating = ratingCount
    ? Number(vendor?.rating || 0) / ratingCount
    : 0;
  const image = vendorImage(vendor);
  const shopName = vendor?.shopName || "Your store";

  return (
    <>
      <canvas ref={canvasRef} className="store-celebration-confetti" />

      <div
        className="store-celebration-preview"
        role="img"
        aria-label="Non-interactive customer storefront preview"
      >
        <header className="store-celebration-store-header" aria-hidden="true">
          <img src={`${FIGMA_ASSETS}/arrow-left.svg`} alt="" />
          <div>
            <img src={`${FIGMA_ASSETS}/search.svg`} alt="" />
            <img src={`${FIGMA_ASSETS}/share.svg`} alt="" />
          </div>
        </header>

        <section className="store-celebration-summary">
          <div className="store-celebration-identity">
            {image ? (
              <img src={image} alt={shopName} />
            ) : (
              <span>{shopName.slice(0, 1).toUpperCase()}</span>
            )}
            <div>
              <h3>{shopName}</h3>
              <span className="store-celebration-badge">
                <img src={badge.asset} alt="" />
                <b style={{ color: badge.ink }}>{badge.label}</b>
              </span>
            </div>
          </div>

          <div className="store-celebration-metrics">
            <div>
              <strong>
                {averageRating.toFixed(1)}
                <FaStar />
              </strong>
              <span>{ratingCount} reviews</span>
            </div>
            <i aria-hidden="true" />
            <div>
              <strong>{Number(vendor?.followersCount || 0).toLocaleString()}</strong>
              <span>Followers</span>
            </div>
            <i aria-hidden="true" />
            <div>
              <strong>{availableItems(vendor)}</strong>
              <span>Items available</span>
            </div>
          </div>

          <div className="store-celebration-follow">Follow</div>
        </section>

        <nav className="store-celebration-tabs" aria-hidden="true">
          <span className="is-active">Products</span>
          <span>Reviews</span>
          <span>About</span>
        </nav>

        <section className="store-celebration-empty">
          <LuPackageOpen />
          <strong>No items available yet</strong>
          <span>Your published products will appear here.</span>
        </section>
      </div>
    </>
  );
}
