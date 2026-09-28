import {
  injectDependencies as injectPlgDependencies,
  injectStore as injectPlgStore,
} from './services/plgBaseAPI';
import {
  injectDependencies as injectOrionAiInsightsDependencies,
  injectStore as injectOrionAiInsightsStore,
} from './services/orionAiInsightsAPI';
import {
  injectStore as injectOrionTimeTrackingStore,
} from './services/orionTimeTracking';

export { default as InputField } from './components/InputField';
export { default as ToastDialog } from './components/ToastDialog';
export { default as SelectDropDown } from './components/SelectDropDown';
export { default as TopProgressBar } from './components/TopProgressBar';
export { default as PopupModal } from './components/PopupModal';

// Services
export { default as plgBaseAPI } from './services/plgBaseAPI';
export { default as orionAiInsightsAPI } from './services/orionAiInsightsAPI';
export { default as orionTimeTrackingAPI } from './services/orionTimeTracking';

export const injectDependencies = (deps) => {
  injectPlgDependencies(deps);
  injectOrionAiInsightsDependencies(deps);
};

export const injectStore = (store) => {
  injectPlgStore(store);
  injectOrionAiInsightsStore(store);
  injectOrionTimeTrackingStore(store);
};
export { default as loggerService } from './services/logger.service';

// Hooks
export { default as useToast } from './hooks/useToast';
export { default as useGlobalMaster } from './hooks/useGlobalMaster';

// Utils
export * from './utils/storage';
export {
  API_ERROR_TYPES,
  getApiErrorMeta,
  getApiErrorMessage,
  isConnectionBlockedError,
  getRuntimeConfigErrorMeta,
  isAuthConfigOrNetworkError,
  getLoginConnectionErrorMeta,
} from './utils/apiError';

// Constants
export { WITHOUTGATEWAY } from './constant/service';
export { GATEWAY } from './constant/plg-gateWayService';
export { WITHOUTGATEWAY as API_PATHS } from './constant/service';
export { GATEWAY as GATEWAY_PATHS } from './constant/plg-gateWayService';




// Auth (username/password JWT session)
export * from './services/authSession';
