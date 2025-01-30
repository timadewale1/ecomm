// src/redux/actions/marketActions.js
export const SET_MARKET_IMAGES = "SET_MARKET_IMAGES";
export const SET_MARKET_LOADING = "SET_MARKET_LOADING";


// src/redux/actions/marketActions.js
export const setMarketImages = (images) => ({
    type: SET_MARKET_IMAGES,
    payload: images,
  });
  
  export const setMarketLoading = (loading) => ({
    type: SET_MARKET_LOADING,
    payload: loading,
  });
  