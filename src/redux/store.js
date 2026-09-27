// store.js
import { createStore, applyMiddleware, combineReducers } from "redux";
import thunk from "redux-thunk";
import { createTransform, persistReducer, persistStore } from "redux-persist";
import { safeStorage as storage } from "../services/storage";
import conditionCategoriesSlice from "./reducers/conditionCategoriesSlice";
// Reducers
import { cartReducer } from "./reducers/reducer";
import homepageReducer from "./reducers/homepagereducer";
import productReducer from "./reducers/productreducers";
import authReducer from "./reducers/authreducers";
import orderReducer from "./reducers/orderreducer";
import discountProductsReducer from "./reducers/discountProductsSlice";
import categoriesReducer from "./reducers/categoriesSlice";
import conditionReducer from "./reducers/conditionSlice";
import { marketReducer } from "./reducers/marketreducer";
import personalDiscountsSlice from "./reducers/personalDiscount";
import userReducer from "./reducers/userreducer";
import vendorProfileReducer from "./vendorProfileSlice";
import recentactivitiesReducer from "./recentActivitiesSlice";
import storepageVendorsReducer from "./reducers/storepageVendorsSlice";
import stockpileReducer from "./reducers/stockpileSlice";
import vendorReducer from "./reducers/VendorsSlice";
import personalDiscountsPageReducer from "./reducers/personalDiscountsPageSlice";
import { promoReducer } from "./reducers/promoreducer";
import exploreReducer from "./reducers/exploreSlice";
import quickModeReducer from "./reducers/quickModeSlice";
import vendorTutorialsReducer from "./reducers/vendortutorialSlice";
import exploreUiReducer from "./reducers/exploreUiSlice";
import chatReducer from "./reducers/chatSlice";
import vendorChatReducer from "./reducers/vendorChatSlice";
import catsectionReducer from "./reducers/catsection";
import vendorSuggestionsReducer from "./reducers/exploreSlice"
import categoryProductsReducer from "./reducers/categoryProductsSlice";
import topVendorsReducer from "./reducers/topVendorsSlice";
import categoryItemsReducer from "./reducers/categoryItemsSlice";
import categoryTypesReducer from "./reducers/categoryTypesSlice";
import scrollReducer from "./reducers/scrollSlice";
import vendorStockpileReducer from "./reducers/vendorStockpileSlice";
import homeFeedSnapshotReducer from "./reducers/homeFeedSnapshotReducer";
import categoryMetadataReducer from "./reducers/categoryMetadataSlice";
import featuredReducer from "./reducers/featuredSlice";
import searchSnapshotReducer from "./reducers/searchSnapshotReducer";
import favoritesReducer from "./reducers/favoritesSlice";
import buyerOrdersReducer from "./reducers/buyerOrdersSlice";
import buyerOffersReducer from "./reducers/buyerOffersSlice";
import notificationsRealtimeReducer from "./reducers/notificationsRealtimeSlice";
import userWalletReducer from "./reducers/userWalletSlice";
import similarItemsReducer from "./reducers/similarItemsSlice";
import mySizesReducer from "./reducers/mySizesSlice";
import cartSyncReducer from "./reducers/cartSyncSlice";
import offerConversationsReducer from "./reducers/offerConversationsSlice";

const favoritesTransform = createTransform(
  (favorites) => ({
    ownerUid: favorites?.ownerUid || null,
    ids: Array.isArray(favorites?.ids) ? favorites.ids : [],
    entities:
      favorites?.entities && typeof favorites.entities === "object"
        ? favorites.entities
        : {},
    unavailableIds: Array.isArray(favorites?.unavailableIds)
      ? favorites.unavailableIds
      : [],
    lastFetchedAt: favorites?.lastFetchedAt || null,
    pendingGuestMergeIds: Array.isArray(favorites?.pendingGuestMergeIds)
      ? favorites.pendingGuestMergeIds
      : [],
  }),
  (favorites) => {
    const ids = Array.isArray(favorites?.ids) ? favorites.ids : [];
    const entities =
      favorites?.entities && typeof favorites.entities === "object"
        ? favorites.entities
        : {};

    return {
      ownerUid: favorites?.ownerUid || null,
      ids,
      entities,
      unavailableIds: Array.isArray(favorites?.unavailableIds)
        ? favorites.unavailableIds.filter((id) => ids.includes(id))
        : [],
      status: ids.some((id) => entities[id]) ? "ready" : "idle",
      error: null,
      lastFetchedAt: favorites?.lastFetchedAt || null,
      cloudStatus: "idle",
      cloudHydrated: false,
      cloudError: null,
      pendingGuestMergeIds: Array.isArray(favorites?.pendingGuestMergeIds)
        ? favorites.pendingGuestMergeIds.filter((id) => ids.includes(id))
        : [],
    };
  },
  { whitelist: ["favorites"] }
);

const mySizesTransform = createTransform(
  (mySizes) => ({
    ownerUid: mySizes?.ownerUid || null,
    schemaVersion: mySizes?.schemaVersion || 1,
    profiles: mySizes?.profiles || null,
    lastFetchedAt: mySizes?.lastFetchedAt || null,
  }),
  (mySizes) => ({
    ownerUid: mySizes?.ownerUid || null,
    schemaVersion: mySizes?.schemaVersion || 1,
    profiles: mySizes?.profiles || null,
    status:
      mySizes?.ownerUid && mySizes?.profiles && mySizes?.lastFetchedAt
        ? "ready"
        : "idle",
    error: null,
    requestId: null,
    lastFetchedAt: mySizes?.lastFetchedAt || null,
    saveStatus: "idle",
    saveError: null,
    saveRequestId: null,
    rollbackProfiles: null,
  }),
  { whitelist: ["mySizes"] },
);

const recentActivitiesTransform = createTransform(
  (activities) => ({
    ownerVendorId: activities?.ownerVendorId || null,
    activities: Array.isArray(activities?.activities)
      ? activities.activities.slice(0, 30).map((activity) => ({
          ...activity,
          timestampMs: Number(activity?.timestampMs || 0),
        }))
      : [],
    lastFetchedAt: activities?.lastFetchedAt || null,
  }),
  (activities) => {
    const cachedActivities = Array.isArray(activities?.activities)
      ? activities.activities
      : [];
    return {
      ownerVendorId: activities?.ownerVendorId || null,
      activities: cachedActivities,
      // Firestore DocumentSnapshot cursors cannot safely be persisted. A quiet
      // first-page refresh recreates the cursor before pagination resumes.
      lastDoc: null,
      status: cachedActivities.length ? "ready" : "idle",
      error: null,
      hasMore: true,
      paginationReady: false,
      lastFetchedAt: activities?.lastFetchedAt || null,
      activeRequestId: null,
    };
  },
  { whitelist: ["activities"] },
);

const userWalletTransform = createTransform(
  (wallet) => ({
    ownerUid: wallet?.ownerUid || null,
    transactions: Array.isArray(wallet?.transactions)
      ? wallet.transactions
      : [],
    transactionsLastFetchedAt: wallet?.transactionsLastFetchedAt || null,
  }),
  (wallet) => {
    const transactions = Array.isArray(wallet?.transactions)
      ? wallet.transactions
      : [];
    return {
      ownerUid: wallet?.ownerUid || null,
      balance: 0,
      accountNumber: "",
      bankName: "",
      walletSetup: false,
      snapshotStatus: "idle",
      snapshotError: null,
      initialSnapshotReceived: false,
      transactions,
      transactionsStatus: transactions.length ? "ready" : "idle",
      transactionsError: null,
      transactionsRequestId: null,
      transactionsLastCompletedRequestId: null,
      transactionsLastFetchedAt: wallet?.transactionsLastFetchedAt || null,
      entryAnimationPlayed: false,
    };
  },
  { whitelist: ["userWallet"] },
);

const offerConversationsTransform = createTransform(
  (conversations) => ({
    ids: Array.isArray(conversations?.ids) ? conversations.ids : [],
    entities:
      conversations?.entities && typeof conversations.entities === "object"
        ? conversations.entities
        : {},
    ownerUid: conversations?.ownerUid || null,
    ownerRole: conversations?.ownerRole || null,
    lastSyncedAt: conversations?.lastSyncedAt || null,
  }),
  (conversations) => ({
    ids: Array.isArray(conversations?.ids) ? conversations.ids : [],
    entities:
      conversations?.entities && typeof conversations.entities === "object"
        ? conversations.entities
        : {},
    ownerUid: conversations?.ownerUid || null,
    ownerRole: conversations?.ownerRole || null,
    status: Array.isArray(conversations?.ids) && conversations.ids.length
      ? "ready"
      : "idle",
    error: null,
    initialSnapshotReceived: false,
    lastSyncedAt: conversations?.lastSyncedAt || null,
  }),
  {whitelist: ["offerConversations"]},
);

const persistConfig = {
  key: "root",
  storage,
  whitelist: [
    "stockpile",
    "quickMode",
    "favorites",
    "mySizes",
    "activities",
    "userWallet",
    "orders",
    "offerConversations",
  ],
  transforms: [
    favoritesTransform,
    mySizesTransform,
    recentActivitiesTransform,
    userWalletTransform,
    offerConversationsTransform,
  ],
};

// Combined Reducers
const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  cartSync: cartSyncReducer,
  conditionCategories: conditionCategoriesSlice,
  topVendors: topVendorsReducer,
  product: productReducer,
  explore: exploreReducer,
   homeFeedSnapshot: homeFeedSnapshotReducer,
  searchSnapshot: searchSnapshotReducer,
  exploreUi: exploreUiReducer,
  user: userReducer,
  vendorSuggestions: vendorSuggestionsReducer,
  categoryItems: categoryItemsReducer,
  scroll: scrollReducer,
  categoryTypes: categoryTypesReducer,
  vendorChats: vendorChatReducer,
  stockpile: stockpileReducer, // will be persisted
  storepageVendors: storepageVendorsReducer,
  orders: orderReducer,
  discountProducts: discountProductsReducer,
  market: marketReducer,
  featured: featuredReducer,
  promo: promoReducer,
  quickMode: quickModeReducer,
  chat: chatReducer,
  categoryMetadata: categoryMetadataReducer,
  vendorStockpile: vendorStockpileReducer,
  personalDiscountsPage: personalDiscountsPageReducer,
  personalDiscounts: personalDiscountsSlice,
  homepage: homepageReducer,
  catsection: catsectionReducer,
  categories: categoriesReducer,
  vendorTutorials: vendorTutorialsReducer,
  vendors: vendorReducer,
  condition: conditionReducer,
  categoryProducts: categoryProductsReducer,
  vendorProfile: vendorProfileReducer,
  activities: recentactivitiesReducer,
  favorites: favoritesReducer,
  buyerOrders: buyerOrdersReducer,
  buyerOffers: buyerOffersReducer,
  notificationsRealtime: notificationsRealtimeReducer,
  userWallet: userWalletReducer,
  similarItems: similarItemsReducer,
  mySizes: mySizesReducer,
  offerConversations: offerConversationsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = createStore(
  persistedReducer,
  applyMiddleware(thunk)
);

export const persistor = persistStore(store);
export default store;
