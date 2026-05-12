/** Pixel tracking method more commonly supported per ATS vendor (for REC badge). */
const VENDOR_PIXEL_METHOD_REC: Record<string, "js" | "image"> = {
  Workday: "js",
  JobInvite: "image",
  Bullhorn: "js",
  BambooHR: "js",
  Avionte: "image",
};

export function pixelMethodRecommendationForVendor(
  vendor: string,
): "js" | "image" | undefined {
  const v = vendor.trim();
  return VENDOR_PIXEL_METHOD_REC[v] ?? undefined;
}
