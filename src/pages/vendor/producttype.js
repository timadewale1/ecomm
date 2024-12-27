// productTypes.js
import productSizes from "./productsizes";

const productTypes = [
  // Clothing
  {
    type: "Jeans",
    subTypes: [
      "Blue Jeans",
      "Black Jeans",
      "Boyfriend Jeans",
      "Skinny Jeans",
      "Straight Jeans",
      "Bootcut Jeans",
      "Ripped Jeans",
      "Jorts",
      "Flare Jeans",
      "Baggy Jeans",
      "High-Waist Jeans",
      "Low-Waist Jeans",
      "Mom Jeans",
    ],
    sizes: productSizes["Jeans"],
  },
  {
    type: "Corporate Women",
    subTypes: [
      {
        name: "Blazers",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].Blazers || []
          : [], // Fallback if key or subkey is missing
      },
      {
        name: "Pencil Skirts",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].PencilSkirts || []
          : [],
      },
      {
        name: "Dress Shirts",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].DressShirts || []
          : [],
      },
      {
        name: "Corporate Dresses",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].CorporateDresses || []
          : [],
      },
      {
        name: "WideLeg Trousers",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].WideLegTrousers || []
          : [],
      },
      {
        name: "Pant Suits",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].PantSuits || []
          : [],
      },
      {
        name: "Shirt Dresses",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].ShirtDresses || []
          : [],
      },
      {
        name: "Office Tops",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].OfficeTops || []
          : [],
      },
      {
        name: "Blazer Dresses",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].BlazerDresses || []
          : [],
      },
      {
        name: "Long Sleeve Blouses",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].LongSleeveBlouses || []
          : [],
      },
      {
        name: "Jumpsuits",
        sizes: productSizes["Corporate Women"]
          ? productSizes["Corporate Women"].Jumpsuits || []
          : [],
      },
    ],
  },
  {
    type: "Corporate Men",
    subTypes: [
      {
        name: "White Shirts",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].WhiteShirts || []
          : [],
      },
      {
        name: "Light Blue Shirts",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].LightBlueShirts || []
          : [],
      },
      {
        name: "Plain Trousers",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].PlainTrousers || []
          : [],
      },
      {
        name: "Suit Vests",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].SuitVests || []
          : [],
      },
      {
        name: "Blazers",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].Blazers || []
          : [],
      },
      {
        name: "Tailored Suits",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].TailoredSuits || []
          : [],
      },
      {
        name: "Dress Pants",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].DressPants || []
          : [],
      },
      {
        name: "Double-Breasted Jackets",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].DoubleBreastedJackets || []
          : [],
      },
      {
        name: "Button-Up Shirts",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].ButtonUpShirts || []
          : [],
      },
      {
        name: "Checkered Shirts",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].CheckeredShirts || []
          : [],
      },
      {
        name: "Cardigans",
        sizes: productSizes["Corporate Men"]
          ? productSizes["Corporate Men"].Cardigans || []
          : [],
      },
    ],
  },
  {
    type: "Skirts",
    subTypes: [
      "Mini Skirts",
      "Maxi Skirts",
      "Pencil Skirts",
      "A-line Skirts",
      "Pleated Skirts",
      "Wrap Skirts",
      "Plaid Skirts",
      "Leather Skirts",
      "Denim Skirts",
      "Tulle Skirts",
    ],
    sizes: productSizes["Skirts"],
  },
  {
    type: "T-Shirts",
    subTypes: [
      "Graphic Tees",
      "Plain T-Shirts",
      "V-Neck Tees",
      "Crew Neck Tees",
      "Tank Tops",
      "Henley Shirts",
      "Long Sleeve Tees",
      "Polo Shirts",
      "Crop Tops",
      "Baseball Tees",
    ],
    sizes: productSizes["T-Shirts"],
  },
  {
    type: "Hair Accessories",
    subTypes: [
      "Headband",
      "Hair Clip",
      "Hair Tie",
      "Scrunchie",
      "Hair Pin",
      "Barrette",
      "Hair Comb",
      "Claw Clip",
      "Bun Maker",
      "Turban",
    ],
    sizes: productSizes["Hair Accessories"],
  },
  {
    type: "Jackets",
    subTypes: [
      "Leather Jackets",
      "Denim Jackets",
      "Bomber Jackets",
      "Puffer Jackets",
      "Windbreakers",
      "Jean Jackets",
      "Blazers",
      "Hooded Jackets",
      "Trench Coats",
      "Cardigans",
      "Varsity Jackets",
    ],
    sizes: productSizes["Jackets"],
  },
  {
    type: "Dresses",
    subTypes: [
      "Cocktail Dresses",
      "Evening Gowns",
      "Maxi Dresses",
      "Mini Dresses",
      "Bodycon Dresses",
      "Wrap Dresses",
      "Church Gowns",
      "Shift Dresses",
      "Sweater Dresses",
      "A-line Dresses",
      "Sundresses",
    ],
    sizes: productSizes["Dresses"],
  },
  {
    type: "Sweatpants",
    subTypes: [
      "Joggers",
      "Cargo Sweatpants",
      "Skinny Sweatpants",
      "Baggy Sweatpants",
      "Yoga Pants",
      "Drawstring Pants",
      "Slim Fit Sweatpants",
      "Athletic Pants",
      "Fleece Pants",
      "Wide-Leg Pants",
    ],
    sizes: productSizes["Sweatpants"],
  },
  // Accessories
  {
    type: "Hats",
    subTypes: [
      "Baseball Caps",
      "Face Caps",
      "Bucket Hats",
      "Beanies",
      "Fedoras",
      "Panama Hats",
      "Berets",
      "Snapbacks",
      "Sun Hats",
      "Visors",
      "Flat Caps",
    ],
    sizes: productSizes["Hats"],
  },
  {
    type: "Bags",
    subTypes: [
      "Backpacks",
      "Handbags",
      "Clutches",
      "Messenger Bags",
      "Tote Bags",
      "Crossbody Bags",
      "Duffel Bags",
      "Satchels",
      "Sling Bags",
      "Belt Bags",
    ],
    sizes: productSizes["Bags"],
  },
  {
    type: "Sunglasses",
    subTypes: [
      "Aviators",
      "Wayfarers",
      "Round Sunglasses",
      "Square Sunglasses",
      "Cat Eye Sunglasses",
      "Sport Sunglasses",
      "Polarized Sunglasses",
      "Oversized Sunglasses",
      "Retro Sunglasses",
      "Browline Sunglasses",
    ],
    sizes: productSizes["Sunglasses"],
  },
  // Perfumes
  {
    type: "Perfumes",
    subTypes: [
      "Perfume oils",
      "Womens Perfumes",
      "Mens Perfumes",
      "Unisex Perfumes",
      "Body Sprays",
      "Eau de Parfum",
      "Eau de Toilette",
      "Eau de Cologne",
      "Fragrance Mists",
      "Roll-on Perfumes",
      "Solid Perfumes",
      "Aftershaves",
      "Hair Perfumes",
      "Travel-Size Perfumes",
      "Luxury Perfumes",
      "Designer Perfumes",
      "Natural/Organic Perfumes",
      "Layering Scents",
      "Limited Edition Perfumes",
      "Perfume Gift Sets",
    ],
    sizes: productSizes["Perfumes"],
  },
  {
    type: "Underwears",
    subTypes: [
      "Briefs",
      "Panties",
      "Halfcuts",
      "Boxers",
      "Trunks",
      "Bikini Bottoms",
      "Thongs",
      "Boyshorts",
      "Hipsters",
      "Boxer Briefs",
      "G-Strings",
      "Camisoles",
      "Bralettes",
      "Shapewear",
      "Thermal Underwear",
    ],
    sizes: productSizes["Underwears"],
  },
  
  // Hair Products
  {
    type: "Hair Products",
    subTypes: [
      "Shampoo",
      "Conditioner",
      "Hair Gel",
      "Hair Wax",
      "Hair Serum",
      "Hair Oil",
      "Leave-In Conditioner",
      "Hair Mask",
      "Mousse",
      "Heat Protectant",
    ],
    sizes: productSizes["Hair Products"],
  },
  // Sportswear
  {
    type: "Sportswear",
    subTypes: [
      { name: "Jerseys", sizes: productSizes["Sportswear"].Jerseys },
      { name: "Shorts", sizes: productSizes["Sportswear"].Shorts },
      { name: "Tracksuits", sizes: productSizes["Sportswear"].Tracksuits },
      { name: "Sweatbands", sizes: productSizes["Sportswear"].Sweatbands },
      { name: "Headbands", sizes: productSizes["Sportswear"].Headbands },
      {
        name: "Compression Pants",
        sizes: productSizes["Sportswear"].CompressionPants,
      },
      { name: "Running Shoes", sizes: productSizes["Sportswear"].RunningShoes },
      { name: "Yoga Pants", sizes: productSizes["Sportswear"].YogaPants },
      { name: "Tank Tops", sizes: productSizes["Sportswear"].TankTops },
    ],
  },
  // Footwear
  {
    type: "Footwear",
    subTypes: [
      "Sneakers",
      "Loafers",
      "Boots",
      "Sandals",
      "Heels",
      "Flats",
      "Wedges",
      "Flip Flops",
      "Oxfords",
      "Brogues",
      "Corporate Shoes",
    ],
    sizes: productSizes["FootWear"],
  },
  // Gym Wear
  {
    type: "Gym Wear",
    subTypes: [
      "Tank Tops",
      "Compression Shirts",
      "Shorts",
      "Joggers",
      "Leggings",
      "Sweatpants",
      "Sports Bras",
      "Hoodies",
      "Gym T-Shirts",
      "Track Suits",
      "Windbreakers",
      "Sleeveless Hoodies",
      "Athletic Tights",
      "Compression Shorts",
      "Gym Jackets",
    ],
    sizes: productSizes["Hoodies & Sweatshirts"], // Adjust as appropriate
  },
  // Wristwatches
  {
    type: "Wristwatches",
    subTypes: [
      "Digital Watches",
      "Analog Watches",
      "Sports Watches",
      "Leather Strap Watches",
      "Metal Bracelet Watches",
      "Smart Watches",
      "Dress Watches",
      "Chronograph Watches",
      "Minimalist Watches",
      "Fashion Watches",
    ],
    sizes: productSizes["Wristwatches"], // Replace with appropriate sizes if available
  },
  // Jewelry
  {
    type: "Jewelry",
    subTypes: [
      { name: "Bracelets", sizes: productSizes["Jewelry"].Bracelets },
      { name: "Necklaces", sizes: productSizes["Jewelry"].Necklaces },
      { name: "Earrings", sizes: productSizes["Jewelry"].Earrings },
      { name: "Rings", sizes: productSizes["Jewelry"].Rings },
      { name: "Anklets", sizes: productSizes["Jewelry"].Anklets },
      { name: "Waist Beads", sizes: productSizes["Jewelry"].WaistBeads },
      { name: "Chokers", sizes: productSizes["Jewelry"].Chokers },
      { name: "Cuff Bracelets", sizes: productSizes["Jewelry"].CuffBracelets },
      { name: "Bangles", sizes: productSizes["Jewelry"].Bangles },
      { name: "Brooches", sizes: productSizes["Jewelry"].Brooches },
      { name: "Pendants", sizes: productSizes["Jewelry"].Pendants },
    ],
  },
  // Earrings
  {
    type: "Earrings",
    subTypes: [
      "Stud Earrings",
      "Hoop Earrings",
      "Drop Earrings",
      "Chandelier Earrings",
      "Huggie Earrings",
      "Threader Earrings",
      "Clip-On Earrings",
      "Teardrop Earrings",
      "Ball Earrings",
      "Jacket Earrings",
    ],
    sizes: productSizes["Earrings"],
  },
  // Necklaces
  {
    type: "Necklaces",
    subTypes: [
      "Pendant Necklaces",
      "Chain Necklaces",
      "Choker Necklaces",
      "Layered Necklaces",
      "Charm Necklaces",
      "Beaded Necklaces",
      "Locket Necklaces",
      "Bib Necklaces",
      "Medallion Necklaces",
      "Bar Necklaces",
    ],
    sizes: productSizes["Necklaces"],
  },
  {
    type: "Sports Bras",
    subTypes: [
      "High Impact Bra",
      "Low Impact Bra",
      "Medium Impact Bra",
      "Padded Bra",
      "Racerback Bra",
      "Strappy Bra",
      "Compression Bra",
      "Zip-Front Bra",
      "Mesh Bra",
      "Seamless Bra",
    ],
    sizes: productSizes["Sports Bras"],
  },
  {
    type: "Hoodies & Sweatshirts",
    subTypes: [
      "Running Hoodie",
      "Training Hoodie",
      "Gym Hoodie",
      "Pullover Hoodie",
      "Full Zip Hoodie",
      "Lightweight Sweatshirt",
      "Fleece Hoodie",
      "Thermal Hoodie",
      "Oversized Hoodie",
      "Printed Hoodie",
    ],
    sizes: productSizes["Hoodies & Sweatshirts"],
  },
  {
    type: "Tights & Leggings",
    subTypes: [
      "Running Tights",
      "Compression Tights",
      "Yoga Leggings",
      "Gym Tights",
      "Training Leggings",
      "High-Waisted Leggings",
      "Thermal Leggings",
      "Printed Leggings",
      "Cycling Tights",
      "Capri Leggings",
    ],
    sizes: productSizes["Tights & Leggings"],
  },
  {
    type: "Gloves",
    subTypes: [
      "Goalkeeper Gloves",
      "Boxing Gloves",
      "Batting Gloves",
      "Gym Gloves",
      "Cycling Gloves",
      "Golf Gloves",
      "Running Gloves",
      "Riding Gloves",
      "Weightlifting Gloves",
      "Ski Gloves",
    ],
    sizes: productSizes["Gloves"],
  },
  {
    type: "Slides",
    subTypes: [
      "Nike Slides",
      "Adidas Slides",
      "Puma Slides",
      "Leather Slides",
      "Fur Slides",
      "Rubber Slides",
      "Gucci Slides",
      "Jordan Slides",
      "Under Armour Slides",
      "Birkenstock Slides",
      "Champion Slides",
      "Lacoste Slides",
      "Reef Slides",
    ],
    sizes: productSizes["Slides"],
  },
];

export default productTypes;
