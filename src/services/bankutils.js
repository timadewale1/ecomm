export const fetchBankList = async (token) => {
  console.log("Fetching bank list with token:", token); // Debug log

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

    console.log("Fetch bank list response:", response); // Log response object

    const data = await response.json();
    console.log("Parsed bank list data:", data); // Log parsed data

    if (response.ok && data.status) {
      console.log("Bank list fetched successfully:", data.data);
      return data.data; // List of banks
    } else {
      console.error("Failed to fetch bank list:", data.message);
      throw new Error(data.message || "Failed to fetch bank list.");
    }
  } catch (error) {
    console.error("Error fetching bank list:", error);
    return [];
  }
};

export const resolveBankName = (banks, bankId) => {
    console.log("Resolving bank name for bankId:", bankId, "from banks:", banks);
  
    const matchedBank = banks.find((bank) => bank.id === bankId);
  
    if (matchedBank) {
      console.log("Bank resolved successfully:", matchedBank.name);
      return matchedBank.name;
    } else {
      console.warn("Bank ID not found:", bankId);
      return "Unknown Bank";
    }
  };
  
