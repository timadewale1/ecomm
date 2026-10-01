import {httpsCallable} from "firebase/functions";
import {auth,functions} from "../firebase.config";
import {createOrderProductReader} from "./orderProductAccess.mjs";

export const getOrderProductSnapshots=createOrderProductReader({
  getSession:()=>auth.currentUser,
  call:data=>httpsCallable(functions,"getOrderProductSnapshotsV1")(data),
  onError:error=>console.warn("[orders] optional product details unavailable",{code:error?.code}),
});
