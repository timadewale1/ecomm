import {Capacitor} from "@capacitor/core";
import {getAuth} from "firebase/auth";
import {httpsCallable} from "firebase/functions";
import {functions} from "../firebase.config";

let pending=[],timer=null,sending=false;
async function flush(){
  timer=null;if(sending||!pending.length)return;
  const uid=getAuth().currentUser?.uid;if(!uid){pending=[];return;}
  const batch=pending.filter(e=>e.uid===uid).slice(0,20);pending=pending.filter(e=>e.uid===uid).slice(batch.length);
  if(!batch.length)return;
  sending=true;
  try{await httpsCallable(functions,"recordOperationsEventV1")({events:batch.map(({uid:ignored,...e})=>{void ignored;return e;})});}catch{/* Telemetry cannot change checkout, navigation or onboarding outcomes. */}
  finally{sending=false;if(pending.length&&!timer)timer=setTimeout(flush,2000);}
}
export function recordOperationalEvent(type,details={}){
  if(import.meta.env.VITE_OPERATIONS_TELEMETRY!=="true")return;
  try{
    const uid=getAuth().currentUser?.uid;if(!uid||pending.length>=100)return;
    pending.push({id:crypto.randomUUID(),uid,type,platform:Capacitor.getPlatform(),screen:details.screen||"",code:details.code||"",reference:details.reference||""});
    if(!timer)timer=setTimeout(flush,1000);
  }catch{/* Unsupported storage or browser APIs must not affect the app. */}
}
