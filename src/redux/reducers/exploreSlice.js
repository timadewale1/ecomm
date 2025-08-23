import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  documentId,
} from "firebase/firestore";
import { db } from "../../firebase.config";

const chunk = (arr, size = 10) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/* ---------------- vendor meta (already had this earlier) ---------------- */
export const fetchVendorMetaByIds = createAsyncThunk(
  "vendorSuggestions/fetchVendorMetaByIds",
  async (ids, { getState, rejectWithValue }) => {
    try {
      const state = getState().vendorSuggestions;
      const missing = (ids || []).filter((id) => !state.meta[id]);
      if (missing.length === 0) return { meta: {} };

      const meta = {};
      for (const group of chunk(missing, 10)) {
        const snap = await getDocs(
          query(collection(db, "vendors"), where(documentId(), "in", group))
        );
        snap.docs.forEach((d) => {
          const v = d.data() || {};
          meta[d.id] = {
            shopName: v.shopName || v.name || v.storeName || "Vendor",
            profileImageUrl:
              v.profileImageUrl || v.logoUrl || v.avatarUrl || null,
            coverImageUrl: v.coverImageUrl || null,
            badge: v.badge || null,
            createdSince: v.createdSince || v.createdAt || null,
            flashSale: !!v.flashSale,
            flashSaleEndsAt: v.flashSaleEndsAt || null,
            followersCount:
              typeof v.followersCount === "number" ? v.followersCount : 0,
            deliveryMode: v.deliveryMode || "",
            offerPickupPrompt: !!v.offerPickupPrompt,
            pickupAddress: v.pickupAddress || "",
            sourcingMarket: Array.isArray(v.sourcingMarket)
              ? v.sourcingMarket
              : [],
            stockpile: {
              enabled: !!(v.stockpile && v.stockpile.enabled),
              durationInWeeks: v.stockpile?.durationInWeeks || null,
            },
          };
        });
      }
      return { meta };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch vendor meta");
    }
  }
);

/* ---------------- NEW: product meta hydration ---------------- */
export const fetchProductsMetaByIds = createAsyncThunk(
  "vendorSuggestions/fetchProductsMetaByIds",
  async (ids, { getState, rejectWithValue }) => {
    try {
      const state = getState().vendorSuggestions;
      const known = state.productsMeta || {};
      const missing = (ids || []).filter((id) => !known[id]);
      if (missing.length === 0) return { productsMeta: {} };

      const productsMeta = {};
      for (const group of chunk(missing, 10)) {
        const snap = await getDocs(
          query(collection(db, "products"), where(documentId(), "in", group))
        );
        snap.docs.forEach((d) => {
          const p = d.data() || {};
          productsMeta[d.id] = {
            subType: p.subType || null,
            productType: p.productType || null,
          };
        });
      }
      return { productsMeta };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch products meta");
    }
  }
);

/* ---------------- suggestions fetch ---------------- */
export const fetchVendorSuggestions = createAsyncThunk(
  "vendorSuggestions/fetch",
  async ({ pageSize = 12, lastDoc = null }, { dispatch, rejectWithValue }) => {
    try {
      let qy = query(
        collection(db, "vendor_suggestions"),
        orderBy("updatedAt", "desc"),
        limit(pageSize)
      );
      if (lastDoc) qy = query(qy, startAfter(lastDoc));

      const snap = await getDocs(qy);
      const items = snap.docs.map((d) => ({
        id: d.id, // vendorId
        ...d.data(),
        _snap: d, // keep snapshot for pagination
      }));
      const newLastDoc = snap.docs.length
        ? snap.docs[snap.docs.length - 1]
        : null;

      // hydrate vendor meta
      const vendorIds = items.map((i) => i.id);
      await dispatch(fetchVendorMetaByIds(vendorIds));

      // NEW: hydrate product meta (collect all product IDs from these items)
      const productIds = items.flatMap((i) =>
        Array.isArray(i.products)
          ? i.products.map((p) => p.id).filter(Boolean)
          : []
      );
      if (productIds.length) {
        await dispatch(fetchProductsMetaByIds(productIds));
      }

      return { items, lastDoc: newLastDoc };
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch suggestions");
    }
  }
);

const initialState = {
  items: [],
  lastDoc: null,
  status: "idle",
  error: null,

  meta: {}, // vendor meta cache
  metaStatus: "idle",
  metaError: null,

  productsMeta: {}, // NEW: { [productId]: { subType, productType } }
  productsMetaStatus: "idle",
  productsMetaError: null,
};

const vendorSuggestionsSlice = createSlice({
  name: "vendorSuggestions",
  initialState,
  reducers: {
    resetVendorSuggestions(state) {
      state.items = [];
      state.lastDoc = null;
      state.status = "idle";
      state.error = null;
      // keep caches; or clear if you prefer:
      // state.meta = {};
      // state.productsMeta = {};
    },
    removeVendorSuggestion(state, action) {
      const vendorId = action.payload;
      state.items = state.items.filter((v) => v.id !== vendorId);
    },
  },
  extraReducers: (builder) => {
    builder
      // suggestions
      .addCase(fetchVendorSuggestions.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchVendorSuggestions.fulfilled, (state, action) => {
        const { items, lastDoc } = action.payload;
        const seen = new Set(state.items.map((v) => v.id));
        const merged = [...state.items];
        for (const it of items) {
          if (!seen.has(it.id)) {
            merged.push(it);
            seen.add(it.id);
          }
        }
        state.items = merged;
        state.lastDoc = lastDoc;
        state.status = "succeeded";
      })
      .addCase(fetchVendorSuggestions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })

      // vendor meta
      .addCase(fetchVendorMetaByIds.pending, (state) => {
        state.metaStatus = "loading";
        state.metaError = null;
      })
      .addCase(fetchVendorMetaByIds.fulfilled, (state, action) => {
        state.meta = { ...state.meta, ...(action.payload.meta || {}) };
        state.metaStatus = "succeeded";
      })
      .addCase(fetchVendorMetaByIds.rejected, (state, action) => {
        state.metaStatus = "failed";
        state.metaError = action.payload || action.error.message;
      })

      // products meta
      .addCase(fetchProductsMetaByIds.pending, (state) => {
        state.productsMetaStatus = "loading";
        state.productsMetaError = null;
      })
      .addCase(fetchProductsMetaByIds.fulfilled, (state, action) => {
        state.productsMeta = {
          ...state.productsMeta,
          ...(action.payload.productsMeta || {}),
        };
        state.productsMetaStatus = "succeeded";
      })
      .addCase(fetchProductsMetaByIds.rejected, (state, action) => {
        state.productsMetaStatus = "failed";
        state.productsMetaError = action.payload || action.error.message;
      });
  },
});

export const { resetVendorSuggestions, removeVendorSuggestion } =
  vendorSuggestionsSlice.actions;

export default vendorSuggestionsSlice.reducer;
