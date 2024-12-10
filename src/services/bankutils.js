export const fetchBankList = async (token) => {
  console.log("Attempting to fetch bank list with token:", token); // Log token

  try {
    const response = await fetch(
      "https://api.paystack.co/bank?country=nigeria",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Fetch bank list response status:", response.status); // Log response status
    const data = await response.json();
    console.log("Parsed bank list data:", data); // Log parsed data

    if (response.ok && data.status) {
      console.log("Bank list fetched successfully:", data.data); // Log successful data
      return data.data; // List of banks
    } else {
      console.error("Failed to fetch bank list:", data.message);
      throw new Error(data.message || "Failed to fetch bank list.");
    }
  } catch (error) {
    console.error("Error fetching bank list:", error.message || error);
    return [];
  }
};

export const resolveBankName = (banks, bankId) => {
  console.log("Resolving bank name for ID:", bankId);
  console.log("Available banks:", banks);

  const matchedBank = banks.find(
    (bank) => bank.id === bankId || bank.code === bankId
  );
  console.log("Matched bank:", matchedBank);

  return matchedBank ? matchedBank.name : "Unknown Bank";
};
