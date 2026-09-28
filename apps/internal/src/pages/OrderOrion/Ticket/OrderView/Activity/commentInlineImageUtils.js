/**
 * Helpers for inline comment image download naming.
 */

/** Guess a download filename from an image src. */
export const getInlineImageFileName = (src = "", fallbackIndex = 0) => {
  if (typeof src !== "string" || !src) return `image-${fallbackIndex + 1}.png`;
  if (src.startsWith("data:image/")) {
    const match = src.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
    const ext = (match?.[1] || "png").replace("jpeg", "jpg");
    return `image-${fallbackIndex + 1}.${ext}`;
  }
  try {
    const path = src.split("?")[0];
    const name = path.split("/").pop();
    if (name && name.includes(".")) return decodeURIComponent(name);
  } catch {
    /* ignore */
  }
  return `image-${fallbackIndex + 1}.png`;
};

/** Trigger browser download for a data-URL or image URL. */
export const downloadInlineImage = (src, fileName = "image.png") => {
  if (!src) return;

  // data: URLs can be downloaded directly
  if (String(src).startsWith("data:")) {
    const link = document.createElement("a");
    link.href = src;
    link.download = fileName;
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  // Remote/blob URLs — fetch as blob when possible so download attribute works cross-origin.
  fetch(src)
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    })
    .catch(() => {
      const link = document.createElement("a");
      link.href = src;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
};
