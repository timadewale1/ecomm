import {useEffect} from "react";
import {useLocation} from "react-router-dom";
import {useAuth} from "../../custom-hooks/useAuth";
import {recordOperationalEvent} from "../../services/operationalEvents";
const screens=[[/^\/complete-profile/,"vendor_onboarding"],[/^\/vendordashboard/,"vendor_dashboard"],[/^\/vendor-products/,"vendor_products"],[/^\/product\//,"product"],[/^\/cart/,"cart"],[/^\/(newcheckout|checkout|pay)/,"checkout"],[/^\/(user-orders|vendor-orders|orders|order-history)/,"orders"],[/^\/search/,"search"],[/^\/$/,"home"]];
export default function OperationalJourney(){const location=useLocation(),{currentUser}=useAuth();useEffect(()=>{if(!currentUser?.uid)return;const screen=screens.find(([pattern])=>pattern.test(location.pathname))?.[1];if(screen)recordOperationalEvent("screen_view",{screen});},[location.pathname,currentUser?.uid]);return null;}
