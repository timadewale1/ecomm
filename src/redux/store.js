import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import { cartReducer } from './reducers/reducer';
import favoritesReducer from './reducers/favouriteReducers';
import productReducer from './reducers/productreducers';
import authReducer from './reducers/authreducers';
const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  product: productReducer,
  favorites: favoritesReducer,
});

const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;
