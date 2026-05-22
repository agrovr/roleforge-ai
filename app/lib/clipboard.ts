export async function writeClipboardText(text: string) {
  const value = text.trim();
  if (!value) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      const copied = await Promise.race([
        navigator.clipboard.writeText(value).then(() => true),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 900)),
      ]);
      if (copied) return true;
    }
  } catch {
    // Some embedded browsers block navigator.clipboard; fall back below.
  }

  try {
    if (typeof document === "undefined") return false;
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);
    return copied;
  } catch {
    return false;
  }
}
