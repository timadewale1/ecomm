import beltsImage from "../assets/categories/generated/belts-card.png";
import corporateMenImage from "../assets/categories/generated/corporate-men-card.png";
import corporateWomenImage from "../assets/categories/generated/corporate-women-card.png";
import corsetsImage from "../assets/categories/generated/corsets-card.png";
import earringsImage from "../assets/categories/generated/earrings-card.png";
import gymWearImage from "../assets/categories/generated/gym-wear-card.png";
import hoodiesAndSweatshirtsImage from "../assets/categories/generated/hoodies-and-sweatshirts-card.png";
import jeansImage from "../assets/categories/generated/jeans-card.png";
import jewelryImage from "../assets/categories/generated/jewelry-card.png";
import necklacesImage from "../assets/categories/generated/necklaces-card.png";
import scarvesImage from "../assets/categories/generated/scarves-card.png";
import shortsImage from "../assets/categories/generated/shorts-card.png";
import skincareImage from "../assets/categories/generated/skincare-card.png";
import skirtsImage from "../assets/categories/generated/skirts-card.png";
import sportsBrasImage from "../assets/categories/generated/sports-bras-card.png";
import tshirtsImage from "../assets/categories/generated/t-shirts-card.png";
import topsImage from "../assets/categories/generated/tops-card.png";
import wristwatchesImage from "../assets/categories/generated/wristwatches-card.png";

const CATEGORY_BROWSE_IMAGES = Object.freeze({
  Belts: beltsImage,
  Jeans: jeansImage,
  Skincare: skincareImage,
  "Corporate Women": corporateWomenImage,
  "Corporate Men": corporateMenImage,
  Corsets: corsetsImage,
  Earrings: earringsImage,
  "Gym Wear": gymWearImage,
  "Hoodies & Sweatshirts": hoodiesAndSweatshirtsImage,
  Skirts: skirtsImage,
  Jewelry: jewelryImage,
  Necklaces: necklacesImage,
  Scarves: scarvesImage,
  Shorts: shortsImage,
  "Sports Bras": sportsBrasImage,
  "T-Shirts": tshirtsImage,
  Tops: topsImage,
  Wristwatches: wristwatchesImage,
});

export function getCategoryBrowseImage(productType) {
  return CATEGORY_BROWSE_IMAGES[productType] || null;
}
