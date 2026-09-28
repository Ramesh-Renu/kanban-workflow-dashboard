import React, { memo, useMemo } from "react";
import DOMPurify from "dompurify";
import { getInlineImageFileName } from "./commentInlineImageUtils";

/**
 * Split sanitized comment HTML into ordered html/image parts.
 * Images become React nodes with View/Download controls (no invalid div-in-<p>).
 */
export const splitCommentContentParts = (html = "") => {
  const sanitized = DOMPurify.sanitize(html || "", {
    ALLOWED_ATTR: ["href", "target", "src", "alt", "class", "style"],
  });
  if (!sanitized || typeof window === "undefined" || typeof DOMParser === "undefined") {
    return [{ type: "html", html: sanitized || "" }];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div class="comment-html-root">${sanitized}</div>`,
    "text/html",
  );
  const root = doc.body.firstElementChild;
  if (!root) return [{ type: "html", html: sanitized }];

  const parts = [];
  let htmlBuffer = "";
  let imageIndex = 0;

  const flushHtml = () => {
    if (!htmlBuffer) return;
    parts.push({ type: "html", html: htmlBuffer });
    htmlBuffer = "";
  };

  const pushImage = (img) => {
    flushHtml();
    const src = img.getAttribute("src") || "";
    const alt = img.getAttribute("alt") || "";
    const index = imageIndex;
    imageIndex += 1;
    parts.push({
      type: "image",
      src,
      alt,
      index,
      fileName: getInlineImageFileName(src, index),
    });
  };

  const isWhitespace = (node) =>
    node.nodeType === Node.TEXT_NODE && !String(node.textContent || "").trim();

  const isImageOnlyElement = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const imgs = node.querySelectorAll?.("img");
    if (!imgs || imgs.length !== 1) return false;
    return Array.from(node.childNodes).every(
      (child) =>
        isWhitespace(child) ||
        (child.nodeType === Node.ELEMENT_NODE && child.tagName === "IMG"),
    );
  };

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      htmlBuffer += node.textContent || "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.tagName === "IMG") {
      pushImage(node);
      return;
    }

    if (isImageOnlyElement(node)) {
      pushImage(node.querySelector("img"));
      return;
    }

    if (node.querySelector("img")) {
      const tag = node.tagName.toLowerCase();
      let open = `<${tag}`;
      Array.from(node.attributes || []).forEach((attr) => {
        open += ` ${attr.name}="${String(attr.value).replace(/"/g, "&quot;")}"`;
      });
      open += ">";
      htmlBuffer += open;
      Array.from(node.childNodes).forEach((child) => walk(child));
      htmlBuffer += `</${tag}>`;
      return;
    }

    htmlBuffer += node.outerHTML || "";
  };

  Array.from(root.childNodes).forEach((child) => walk(child));
  flushHtml();

  return parts.length ? parts : [{ type: "html", html: sanitized }];
};

const InlineCommentImage = ({ part, onView, onDownload }) => {
  if (!part?.src) return null;

  return (
    <span className="comment-inline-image">
      <img src={part.src} alt={part.alt || part.fileName || "Comment image"} />
      <span className="comment-inline-image__actions" role="group" aria-label="Image actions">
        <button
          type="button"
          className="comment-inline-image__action"
          title="View"
          aria-label="View"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onView?.(part);
          }}
        >
          <span className="icon-open-eye" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="comment-inline-image__action"
          title="Download"
          aria-label="Download"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDownload?.(part);
          }}
        >
          <span className="icon-download_file" aria-hidden="true" />
        </button>
      </span>
    </span>
  );
};

const CommentContentWithInlineImages = ({ html, onViewImage, onDownloadImage }) => {
  const parts = useMemo(() => splitCommentContentParts(html), [html]);

  return (
    <div className="commentInfo-details-comments-content">
      {parts.map((part, index) => {
        if (part.type === "image") {
          return (
            <InlineCommentImage
              key={`comment-img-${part.index}-${index}`}
              part={part}
              onView={onViewImage}
              onDownload={onDownloadImage}
            />
          );
        }
        if (!part.html) return null;
        return (
          <div
            key={`comment-html-${index}`}
            className="commentInfo-details-comments-content__html"
            dangerouslySetInnerHTML={{ __html: part.html }}
          />
        );
      })}
    </div>
  );
};

export default memo(CommentContentWithInlineImages);
