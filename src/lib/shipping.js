export const SHIPPING_COMPANIES = [
  "DHL Express",
  "FedEx",
  "UPS",
  "USPS Priority Mail",
  "EMS",
  "Royal Mail",
  "Hongkong Post",
  "Japan Post",
  "Singapore Post",
  "Australia Post",
  "Deutsche Post DHL",
  "La Poste",
  "PostNord",
  "Poste Italiane",
  "Correos",
  "Canada Post",
  "China Post",
  "Korea Post",
  "India Post",
  "Other",
];

export const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Italy", "Spain", "Japan", "Singapore", "Hong Kong",
  "China", "Taiwan", "South Korea", "Netherlands", "Belgium",
  "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria",
  "Ireland", "Portugal", "Greece", "Poland", "Czech Republic",
  "Brazil", "Mexico", "Argentina", "India", "Malaysia", "Thailand",
  "Philippines", "Vietnam", "Indonesia", "New Zealand", "South Africa",
  "UAE", "Saudi Arabia", "Israel", "Turkey", "Russia", "Other",
];

export const ORDER_STATUS_LABELS = {
  pending_payment: "Pending Payment",
  paid: "Paid",
  preparing: "Preparing",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS = {
  pending_payment: "#94a3b8",
  paid: "#60a5fa",
  preparing: "#fbbf24",
  shipped: "#a78bfa",
  in_transit: "#c084fc",
  delivered: "#34d399",
  cancelled: "#f87171",
};

export const SHIPMENT_STATUSES = ["preparing", "shipped", "in_transit", "delivered"];

export const EXPRESS_CARRIERS = ["DHL Express", "FedEx", "UPS", "EMS"];

// Combined shipping: one package for all cards in the order.
// Base rate covers the package + first card; each additional card adds a small increment.
export function calculateShipping(itemCount, shippingCompany) {
  if (itemCount <= 0) return 0;
  const isExpress = EXPRESS_CARRIERS.includes(shippingCompany);
  const base = isExpress ? 6.99 : 3.99;
  const perExtra = isExpress ? 0.75 : 0.50;
  return base + (itemCount - 1) * perExtra;
}