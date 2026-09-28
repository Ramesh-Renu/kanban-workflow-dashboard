import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import dayjs from "dayjs";
import { t } from "i18next";

const formatPdfDownloadTimestamp = () => dayjs().format("DD MMM YYYY, HH:mm");

export default function useBrandingPreviewPdf({
  previewSections,
  orderId,
  companyName,
  showToast,
}) {
  const pdfExportRef = useRef(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [exportMetadata, setExportMetadata] = useState(null);

  const handleGeneratePdf = useCallback(async () => {
    if (!previewSections?.length) {
      showToast?.({
        message: t(
          "order_view.branding_generate_pdf_empty",
          "Add branding values before generating a PDF."
        ),
        variant: "warning",
      });
      return;
    }

    setPdfGenerating(true);
    try {
      const metadata = {
        orderId: String(orderId || "").trim() || "—",
        companyName: String(companyName || "").trim() || "—",
        downloadedAt: formatPdfDownloadTimestamp(),
      };

      flushSync(() => {
        setExportMetadata(metadata);
      });

      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const element = pdfExportRef.current;
      if (!element) {
        throw new Error("Preview element is not available.");
      }

      const { generateBrandingPreviewPdf } = await import(
        "@orion/shared/src/utils/generateBrandingPreviewPdf"
      );
      const safeOrderId = metadata.orderId !== "—" ? metadata.orderId : "preview";
      await generateBrandingPreviewPdf(element, {
        filename: `branding-guidelines-${safeOrderId}.pdf`,
        companyName: metadata.companyName,
        downloadedAt: metadata.downloadedAt,
        generatedBy: t("common.orion", "Orion"),
        copyrightYear: dayjs().year(),
      });
      showToast?.({
        message: t(
          "order_view.branding_generate_pdf_success",
          "PDF downloaded successfully."
        ),
        variant: "success",
      });
    } catch {
      showToast?.({
        message: t(
          "order_view.branding_generate_pdf_error",
          "Failed to generate PDF. Please try again."
        ),
        variant: "danger",
      });
    } finally {
      setPdfGenerating(false);
    }
  }, [companyName, orderId, previewSections, showToast]);

  return {
    pdfExportRef,
    pdfGenerating,
    handleGeneratePdf,
    exportMetadata,
  };
}
