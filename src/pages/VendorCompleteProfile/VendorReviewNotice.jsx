import React,{useEffect,useState} from "react";
import {useNavigate} from "react-router-dom";
import {getVendorOnboardingDraft} from "../../services/vendorOnboarding";

export default function VendorReviewNotice({vendorId,summary}) {
  const navigate=useNavigate(),[review,setReview]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
  useEffect(()=>{let alive=true;setLoading(true);setError("");setReview(null);getVendorOnboardingDraft().then(result=>{if(alive)setReview(result.review);}).catch(()=>{if(alive)setError("We couldn’t load the review details. Please try again.");}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[vendorId,summary?.version,refresh]);
  const data=review||summary;
  return <section className="mb-5 space-y-3 rounded-2xl border border-orange-200 bg-orange-50 p-5">
    <h2 className="text-lg font-semibold">{data.status==="changes_required"?"Your application needs an update":"Your application was declined"}</h2>
    {loading&&<p role="status" className="text-sm">Loading review details…</p>}
    {error&&<p role="alert" className="text-sm">{error} <button type="button" onClick={()=>setRefresh(r=>r+1)} className="font-semibold text-customOrange">Try again</button></p>}
    {review&&<><p className="text-sm leading-6">{review.reason}</p>{review.suggestions&&<p className="text-sm leading-6">{review.suggestions}</p>}{(review.fields||[]).map(f=><p key={f.key} className="text-sm">{f.reason}</p>)}</>}
    {(data.status==="changes_required"||data.allowReapply)&&<button type="button" className="rounded-xl bg-customOrange px-4 py-3 text-sm font-semibold text-white" onClick={()=>navigate("/complete-profile")}>{data.status==="changes_required"?"Review requested changes":"Update and reapply"}</button>}
    {data.status==="declined"&&!data.allowReapply&&<p className="text-sm">Contact support to request a review of this decision.</p>}
  </section>;
}
