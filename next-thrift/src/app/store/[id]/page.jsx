// app/store/[id]/page.jsx
import StorePage from "./StorePage";

export default function Page({ params }) {
  const { id } = params;
  // Pass the raw ID
  return <StorePage vendorId={id} />;
}
