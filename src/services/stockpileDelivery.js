import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

const call = async (name, payload) => {
  const response = await httpsCallable(functions, name)(payload);
  return response.data;
};

export const getStockpileDeliveryState = (stockpileId) =>
  call("getStockpileDeliveryStateV1", { stockpileId });

export const prepareStockpileDelivery = ({ stockpileId, deliveryAddress }) =>
  call("prepareStockpileDeliveryV1", { stockpileId, deliveryAddress });

export const initializeStockpileDeliveryPayment = ({
  deliveryFulfillmentId,
  paymentMethod,
}) =>
  call("initializeStockpileDeliveryPaymentV1", {
    deliveryFulfillmentId,
    paymentMethod,
  });

export const selectStockpileDeliveryOption = ({
  deliveryFulfillmentId,
  quoteOptionId,
}) =>
  call("selectStockpileDeliveryOptionV1", {
    deliveryFulfillmentId,
    quoteOptionId,
  });
