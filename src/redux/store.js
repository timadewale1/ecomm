import { createStore, applyMiddleware, combineReducers } from 'redux';
import { cartReducer } from './reducers/reducer';
import favoritesReducer from './reducers/favouriteReducers';
import productReducer from './reducers/productreducers';
import thunk from 'redux-thunk';
const rootReducer = combineReducers({
  cart: cartReducer,
  product: productReducer,
  favorites: favoritesReducer,
});

const store = createStore(rootReducer,  applyMiddleware(thunk));

export default store;




