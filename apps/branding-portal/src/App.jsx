import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Spinner from "@orion/shared/src/components/spinner/spinner.component";
import "styles/vendor.scss";
import "@orion/shared/src/styles/icons/style.scss";
import "styles/index.scss";

// Lazy-loaded public pages
const BrandingPublicPreview = lazy(() => import("./pages/BrandingPreview/index"));
const NotFound = lazy(() => import("./pages/BrandingPreview/PublicNotFound"));

const App = () => {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* Valid shared link */}
        <Route path="/branding/:token" element={<BrandingPublicPreview />} />

        {/* Invalid / fallback route */}
        <Route path="/invalid-link" element={<NotFound />} />

        {/* Redirect all other routes */}
        <Route path="*" element={<Navigate to="/invalid-link" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
