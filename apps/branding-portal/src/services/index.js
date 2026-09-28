import plgBaseAPI from "@orion/shared/src/services/plgBaseAPI";
import { WITHOUTGATEWAY } from "@orion/shared/src/constant/service";
import { GATEWAY } from "@orion/shared/src/constant/plg-gateWayService";

/**
 *
 * @param {Record<string, any>} params
 * @returns {Promise<{
 *  data: {Record<string, any>}
 * }>}
 */

const API = !["production"].includes(process.env.REACT_APP_MODE)
  ? WITHOUTGATEWAY
  : GATEWAY;

/** BRANDING GUIDELINE */
export const getBrandingGuideline = (params) => plgBaseAPI.GET(`${API.GET_BRANDING_GUIDELINE}?token=${params.token}`);
export const getBrandingGuidelineNotes = (params) => plgBaseAPI.GET(`${API.GET_BRANDING_GUIDELINE_NOTES}?token=${params.token}&sectionId=${params.sectionId}`);
export const updateBrandingGuidelineNotes = (params) => plgBaseAPI.POST(API.UPDATE_BRANDING_GUIDELINE_NOTES, params);
