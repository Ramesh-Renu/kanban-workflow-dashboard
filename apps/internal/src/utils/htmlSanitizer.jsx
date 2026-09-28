import DOMPurify from "dompurify";

export const sanitizeHTMLContent = (value) => {
  let message = value || "";
  message = message
    .replace(/(<br\s*\/?>\s*)+/gi, "") // remove single or multiple <br> tags
    .replace(/<p>\s*<\/p>/gi, ""); // remove empty <p> tags

  // Step 1: Detect if <img> exists anywhere in the HTML
  const hasImage = /<img[^>]*>/i.test(message);

  // Step 2: Strip HTML safely to get plain text
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = message;
  const plainText = tempDiv.textContent || tempDiv.innerText || "";

  let finalText = "";

  // Step 3: Conditional logic
  if (hasImage) {
    // Allow full message if it has image
    finalText = message;
  } else if (plainText.length <= 20) {
    // Allow plain text directly if it's short
    finalText = plainText;
  } else {
    // Otherwise truncate plain text to 200 chars
    finalText = plainText.slice(0, 200) + (plainText.length > 200 ? "..." : "");
  }

  // Step 4: Sanitize before rendering
  const sanitizedHTML = DOMPurify.sanitize(finalText, {
    ALLOWED_ATTR: ["href", "target", "src", "style"],
  });

  // Step 5: Render
  return (
    <div className="renderText" dangerouslySetInnerHTML={{ __html: sanitizedHTML }}></div>
  );
};
