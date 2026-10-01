import {Capacitor} from "@capacitor/core";

let installed=false;
const seen=new Map();
const safeCode=value=>typeof value==="string" && /^[a-z][a-z0-9_/-]{0,90}$/i.test(value)?value:"unhandled-javascript-error";
export async function reportAppException(error, area="app") {
  if(!Capacitor.isNativePlatform())return;
  const code=safeCode(error?.code), key=`${safeCode(area)}:${code}`;
  const at=Date.now();
  if(seen.get(key)>at-60000)return;
  if(seen.size>=30)seen.delete(seen.keys().next().value);
  seen.set(key,at);
  try {
    const {FirebaseCrashlytics}=await import("@capacitor-firebase/crashlytics");
    await FirebaseCrashlytics.setCustomKey({key:"area",value:safeCode(area),type:"string"});
    // Do not send messages, request bodies, addresses, tokens or customer input.
    const stacktrace=String(error?.stack||"").split("\n").slice(1,16).flatMap(line=>{
      const match=line.match(/(?:\/|\\)([a-zA-Z0-9_.-]+\.js):(\d+):\d+/);
      return match ? [{fileName:match[1],lineNumber:Number(match[2]),functionName:"javascript"}] : [];
    });
    await FirebaseCrashlytics.recordException({message:code,...(stacktrace.length?{stacktrace}:{})});
  } catch { /* Reporting must never interrupt the customer’s action. */ }
}
export function installCrashReporting(){
  if(installed || !Capacitor.isNativePlatform())return;
  installed=true;
  window.addEventListener("error",event=>{void reportAppException(event.error,"window-error");});
  window.addEventListener("unhandledrejection",event=>{void reportAppException(event.reason,"unhandled-promise");});
}
