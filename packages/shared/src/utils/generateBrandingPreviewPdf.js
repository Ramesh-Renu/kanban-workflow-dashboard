import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PDF_PAGE_FORMAT = "a4";
const PDF_ORIENTATION = "p";
const CAPTURE_SCALE = 2;
const PAGE_MARGIN_X_MM = 14;
const PAGE_MARGIN_TOP_MM = 16;
const PAGE_MARGIN_BOTTOM_MM = 22;
const FOOTER_LINE_OFFSET_MM = 12;
const FOOTER_TEXT_Y_OFFSET_MM = 7;
const BLOCK_GAP_MM = 3;
const PDF_BLOCK_SELECTOR = ".branding-preview-pdf-block";

const FOOTER_FONT_SIZE = 8;
const FOOTER_COLOR = { r: 100, g: 116, b: 139 };
const FOOTER_LINE_COLOR = { r: 226, g: 232, b: 240 };

const applyPdfCloneOverflowFixes = (root) => {
  if (!root) return;
  root.style.overflow = "visible";
  root.style.overflowX = "visible";
  root.style.maxWidth = "100%";
  root.querySelectorAll("*").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.overflow = "visible";
    node.style.overflowX = "visible";
  });
};

const captureElement = (element) =>
  html2canvas(element, {
    scale: CAPTURE_SCALE,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    onclone: (_doc, clonedElement) => {
      applyPdfCloneOverflowFixes(clonedElement);
    },
  });

const getCanvasHeightMm = (canvas, contentWidthMm) =>
  (canvas.height * contentWidthMm) / canvas.width;

const buildCopyrightNotice = ({ companyName, generatedBy, copyrightYear }) => {
  const year = copyrightYear ?? new Date().getFullYear();
  const company = String(companyName || "").trim() || "Euroland";
  const app = String(generatedBy || "").trim() || "Orion";
  return `© ${year} Euroland. All rights reserved.`;
};

const applyPdfFooters = (pdf, { companyName, downloadedAt, generatedBy, copyrightYear }) => {
  const pageCount = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const copyrightText = buildCopyrightNotice({ companyName, generatedBy, copyrightYear });
  const downloadedAtText = String(downloadedAt || "").trim();

  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);

    const lineY = pageHeight - FOOTER_LINE_OFFSET_MM;
    const textY = pageHeight - FOOTER_TEXT_Y_OFFSET_MM;

    pdf.setDrawColor(FOOTER_LINE_COLOR.r, FOOTER_LINE_COLOR.g, FOOTER_LINE_COLOR.b);
    pdf.setLineWidth(0.25);
    pdf.line(PAGE_MARGIN_X_MM, lineY, pageWidth - PAGE_MARGIN_X_MM, lineY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FOOTER_FONT_SIZE);
    pdf.setTextColor(FOOTER_COLOR.r, FOOTER_COLOR.g, FOOTER_COLOR.b);
    pdf.text(copyrightText, PAGE_MARGIN_X_MM, textY);

    if (downloadedAtText) {
      pdf.text(downloadedAtText, pageWidth - PAGE_MARGIN_X_MM, textY, { align: "right" });
    }
  }
};

/** Splits a tall canvas across pages when a single block exceeds one page height. */
const addTallCanvasToPdf = (pdf, canvas, contentWidthMm, startY, pageContentHeightMm, marginX) => {
  const totalHeightMm = getCanvasHeightMm(canvas, contentWidthMm);
  const imgData = canvas.toDataURL("image/png");
  let offsetMm = 0;
  let pageIndex = 0;

  while (offsetMm < totalHeightMm) {
    const currentY = pageIndex === 0 ? startY : PAGE_MARGIN_TOP_MM;
    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, "PNG", marginX, currentY - offsetMm, contentWidthMm, totalHeightMm);
    offsetMm += pageContentHeightMm;
    pageIndex += 1;
  }
};

/**
 * Renders preview blocks into a multi-page A4 PDF, keeping each block on one page when possible.
 */
export async function generateBrandingPreviewPdf(
  element,
  {
    filename = "branding-guidelines.pdf",
    companyName = "",
    downloadedAt = "",
    generatedBy = "Orion",
    copyrightYear,
  } = {}
) {
  if (!element) {
    throw new Error("Preview element is not available.");
  }

  const blocks = Array.from(element.querySelectorAll(PDF_BLOCK_SELECTOR));
  const pdf = new jsPDF(PDF_ORIENTATION, "mm", PDF_PAGE_FORMAT);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidthMm = pageWidth - PAGE_MARGIN_X_MM * 2;
  const pageContentHeightMm = pageHeight - PAGE_MARGIN_TOP_MM - PAGE_MARGIN_BOTTOM_MM;
  const maxY = pageHeight - PAGE_MARGIN_BOTTOM_MM;

  let currentY = PAGE_MARGIN_TOP_MM;
  let pageStarted = false;

  const targets = blocks.length > 0 ? blocks : [element];

  for (const block of targets) {
    const canvas = await captureElement(block);
    const blockHeightMm = getCanvasHeightMm(canvas, contentWidthMm);
    const imgData = canvas.toDataURL("image/png");

    if (blockHeightMm > pageContentHeightMm) {
      if (pageStarted) {
        pdf.addPage();
      }
      addTallCanvasToPdf(
        pdf,
        canvas,
        contentWidthMm,
        PAGE_MARGIN_TOP_MM,
        pageContentHeightMm,
        PAGE_MARGIN_X_MM
      );
      currentY = maxY + 1;
      pageStarted = true;
      continue;
    }

    const spaceRemaining = maxY - currentY;
    if (pageStarted && blockHeightMm > spaceRemaining) {
      pdf.addPage();
      currentY = PAGE_MARGIN_TOP_MM;
    }

    pdf.addImage(imgData, "PNG", PAGE_MARGIN_X_MM, currentY, contentWidthMm, blockHeightMm);
    currentY += blockHeightMm + BLOCK_GAP_MM;
    pageStarted = true;
  }

  applyPdfFooters(pdf, { companyName, downloadedAt, generatedBy, copyrightYear });

  pdf.save(filename);
}
