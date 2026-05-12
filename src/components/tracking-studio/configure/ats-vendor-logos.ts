/**
 * Brand SVGs (Simple Icons via jsDelivr). On load error, SearchableDropdown shows a generic image placeholder.
 * Vendors without a curated mark are omitted so the UI shows the placeholder tile.
 * @see https://simpleicons.org/
 */
export const ATS_VENDOR_LOGO_URL: Partial<Record<string, string>> = {
  Workday: "https://cdn.jsdelivr.net/npm/simple-icons@13.15.0/icons/workday.svg",
  Bullhorn: "https://cdn.jsdelivr.net/npm/simple-icons@13.15.0/icons/bullhorn.svg",
  BambooHR: "https://cdn.jsdelivr.net/npm/simple-icons@13.15.0/icons/bamboohr.svg",
};
