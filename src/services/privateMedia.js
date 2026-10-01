import {auth, functions} from "../firebase.config";
import {createPrivateMediaTransport} from "./privateMediaTransport.mjs";

const request = createPrivateMediaTransport({auth,
  endpoint: `https://us-central1-${functions.app.options.projectId}.cloudfunctions.net/privateMediaV1`,
});
export const uploadPrivateImage = (file, input, options = {}) => request(input, {...options, file});
export const loadDeliveryProof = (entityType, entityId, options) => request({entityType, entityId}, options);
