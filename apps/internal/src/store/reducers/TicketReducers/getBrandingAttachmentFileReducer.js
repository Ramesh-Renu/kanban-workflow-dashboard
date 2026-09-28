export const initialBrandingAttachmentState = {
  brandingGuidelines: [],
  orderId: null,
  loading: false,
  error: null,
};

export const getBrandingAttachmentFileReducer = (state, action) => {
  switch (action?.type) {
    case "SET_BRANDING_GUIDELINES_DATA":
      return { ...state, brandingGuidelines: action.payload };
    case "SET_BRANDING_ATTACHMENT_ORDERID":
      return { ...state, orderId: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};
