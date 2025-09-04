useEffect(() => {
  posthog.capture("page_view", { page: "Checkout" });
}, []);
