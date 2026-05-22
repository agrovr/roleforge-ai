export async function writeClipboardText(text: string) {
  const value = text.trim();
  if (!value) return false;

  try {
    if (typeof document === "undefined") return false;
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "0";
    textArea.style.top = "0";
    textArea.style.width = "1px";
    textArea.style.height = "1px";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);
    activeElement?.focus({ preventScroll: true });
    if (copied) return true;
  } catch {
    // Some embedded browsers block selection-based copying; try the async API below.
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      const copied = await Promise.race([
        navigator.clipboard.writeText(value).then(() => true),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 900)),
      ]);
      if (copied) return true;
    }
  } catch {
    return false;
  }

  return false;
}
