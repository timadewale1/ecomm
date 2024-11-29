export const NigerianStates = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
    "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
    "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
    "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
  ];
  // Base rates
const BASE_RATES = {
  "same-state": 1700, // Base for same state
  "in-region": 2000, // Base for same region
  "out-of-region": 3000, // Base for different regions
};

// Fuel cost
const FUEL_COST = 800;

// Region mapping
const REGION_MAPPING = {
  NorthWest: ["Kano", "Kaduna", "Katsina", "Kebbi", "Jigawa", "Zamfara", "Sokoto"],
  NorthEast: ["Borno", "Yobe", "Adamawa", "Taraba", "Bauchi", "Gombe"],
  NorthCentral: ["Benue", "Kogi", "Kwara", "Niger", "Nasarawa", "Plateau", "FCT"],
  SouthWest: ["Lagos", "Ogun", "Oyo", "Osun", "Ekiti", "Ondo"],
  SouthEast: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
  SouthSouth: ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
};

// Helper to get the region of a state
const getRegion = (state) => {
  for (const [region, states] of Object.entries(REGION_MAPPING)) {
    if (states.includes(state)) return region;
  }
  return null; // Return null if state is not found
};

// Calculate delivery fee
export const calculateDeliveryFee = (vendorState, userState, subtotal, isWeekend) => {
  const vendorRegion = getRegion(vendorState);
  const userRegion = getRegion(userState);

  if (!vendorRegion || !userRegion) {
    throw new Error("Invalid states provided for delivery fee calculation.");
  }

  let baseRate;

  if (vendorState === userState) {
    // Same state
    baseRate = BASE_RATES["same-state"];
  } else if (vendorRegion === userRegion) {
    // In-region
    baseRate = BASE_RATES["in-region"];
  } else {
    // Out-of-region
    baseRate = BASE_RATES["out-of-region"];
  }

  // Add fuel cost
  const fuelCost = FUEL_COST;

  // Calculate time-based factor
  const percentage = isWeekend ? 0.04 : 0.02; // 4% on weekends, 2% on weekdays
  const timeFactor = subtotal * percentage;

  // Total delivery fee
  return baseRate + fuelCost + timeFactor;
};
