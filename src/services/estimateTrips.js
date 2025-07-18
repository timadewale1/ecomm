// utils/tripAdvice.js
//
// Turn Google Distance-Matrix output → friendly Lagos-ish advice
// distanceMeters  : number  (e.g. 3500)
// durationSeconds : number  (e.g. 540)

export function getTripAdvice(distanceMeters, durationSeconds) {
  if (distanceMeters == null || durationSeconds == null) return null;

  const km = distanceMeters / 1000;
  const roadMin = Math.round(durationSeconds / 60);

  let headline = "";
  let sub      = "";

  if (km <= 2) {
    // assume 5 km / h walking speed
    const walkMin = Math.round((km / 5) * 60);
    headline = "Walkable";
    sub      = `≈ ${walkMin} min on foot`;
  } else if (km <= 5) {
    headline = "One keke ride";
    sub      = `≈ ${roadMin} min`;
  } else if (km <= 10) {
    headline = "One bus trip";
    sub      = `≈ ${roadMin} min`;
  } else if (km <= 20) {
    headline = "Two bus trips";
    sub      = `Plan ≈ ${roadMin} min`;
  } else {
    headline = "Multiple bus legs";
    sub      = `≈ ${roadMin} min`;
  }

  return { headline, sub };
}
