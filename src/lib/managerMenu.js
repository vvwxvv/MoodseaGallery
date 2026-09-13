import { getMenu, toSections, toLeaves } from "@/lib/menu";

const STANDALONE = { en: "GENERAL", cn: "通用" };

// language stays out of the leaf fetch — keys/models are identical, so pin to "en"
export const getManagerSections = (isCn, source) =>
  toSections(getMenu("managerMenu", isCn, source), STANDALONE[isCn ? "cn" : "en"]);

export const getManagerModels = (source) => toLeaves(getMenu("managerMenu", false, source));