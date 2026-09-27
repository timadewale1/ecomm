export const createPendingApprovalTourSteps = () => [
  {
    target: '[data-vendor-tour="approval-status"]',
    title: "Build your store while we review it",
    content:
      "You can prepare your catalogue now. Your listings stay private and cannot be purchased until your store is approved.",
    placement: "bottom",
  },
  {
    target: '[data-vendor-tour="inventory-summary"]',
    title: "Your catalogue is saved safely",
    content:
      "Draft and published listings both appear in your inventory. Approval automatically unlocks eligible published items for customers.",
    placement: "top",
  },
  {
    target: '[data-vendor-tour="add-product"]',
    title: "Add your first item",
    content:
      "Start listing now. You can edit, unpublish or delete your items from Inventory at any time.",
    placement: "top-end",
    floaterProps: { hideArrow: true },
  },
];
