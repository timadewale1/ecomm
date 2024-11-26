// deliveryPriceEstimator.js

// Predefined delivery price ranges for specific routes
const deliveryPrices = {
    "Lagos-Abuja": { min: 4000, max: 7000 },
    "Abuja-Lagos": { min: 4000, max: 7000 },
    
    "Lagos-Lagos": { min: 1000, max: 3000 },
    "Abuja-Abuja": { min: 1000, max: 3000 },
    "Port Harcourt-Port Harcourt": { min: 1000, max: 3000 },
    "Ogun-Ogun": { min: 1000, max: 3000 },
    "Ilorin-Ilorin": { min: 1000, max: 3000 },
    
    "Lagos-Port Harcourt": { min: 3000, max: 6000 },
    "Port Harcourt-Lagos": { min: 3000, max: 6000 },
    
    "Lagos-Kano": { min: 3500, max: 6500 },
    "Kano-Lagos": { min: 3500, max: 6500 },
    
    "Lagos-Ogun": { min: 3000, max: 7000 },
    "Ogun-Lagos": { min: 3000, max: 7000 },
    
    "Ilorin-Lagos": { min: 3000, max: 6000 },
    "Lagos-Ilorin": { min: 3000, max: 6000 },
  
    // General rule for interstate delivery (if route not defined above)
    "interstate": { min: 1000, max: 3000 },
  };
  
  // Utility function to get the estimated delivery price range
  export const getDeliveryEstimate = (userLocation, vendorLocation) => {
    const routeKey = `${vendorLocation}-${userLocation}`;
    const reverseRouteKey = `${userLocation}-${vendorLocation}`;
  
    if (deliveryPrices[routeKey]) {
      const { min, max } = deliveryPrices[routeKey];
      return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`;
    } else if (deliveryPrices[reverseRouteKey]) {
      const { min, max } = deliveryPrices[reverseRouteKey];
      return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`;
    } else {
      // Default to general interstate rate if not a specific route
      const { min, max } = deliveryPrices["interstate"];
      return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`;
    }
  };
  