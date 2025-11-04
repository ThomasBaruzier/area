export function formatMessage(
  template: string,
  payload: Record<string, unknown>,
): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key: string): string => {
    const trimmedKey = key.trim();
    if (Object.prototype.hasOwnProperty.call(payload, trimmedKey)) {
      const value = payload[trimmedKey];
      switch (typeof value) {
        case "string":
        case "number":
        case "boolean":
          return String(value);
        default:
          return "";
      }
    }
    return "";
  });
}
