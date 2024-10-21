
export const calculateServiceFee = (totalPrice) => {
    let serviceFee = 0;
  
    if (totalPrice < 10000) {
      serviceFee = 50 + (totalPrice / 10000) * 150;
    } else if (totalPrice >= 10000 && totalPrice <= 20000) {
      serviceFee = 200 + ((totalPrice - 10000) / 10000) * 200;
    } else if (totalPrice > 20000 && totalPrice <= 50000) {
      serviceFee = 400 + ((totalPrice - 20000) / 30000) * 400;
    } else {
      serviceFee = 800 + ((totalPrice - 50000) / 50000) * 700;
    }
  
    return serviceFee > 1500 ? 1500 : serviceFee.toFixed(2);
  };
  