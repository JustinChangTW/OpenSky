export const VIEW_MODES = Object.freeze(["standard", "maximized", "fullscreen"]);
export const SIDE_PANEL_STATES = Object.freeze(["expanded", "collapsed", "hidden"]);
export const TOP_BAR_STATES = Object.freeze(["expanded", "compact", "autoHide", "hidden"]);
export const BOTTOM_BAR_STATES = Object.freeze(["expanded", "collapsed", "autoHide", "hidden"]);
export const FOCUS_MODES = Object.freeze(["on", "off"]);
export const LAYOUT_PREFERENCE_PRECEDENCE = Object.freeze(["project", "global", "system-default"]);

export function assertOneOf(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new TypeError(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }
  return value;
}

export function requireString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

export function requireBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${fieldName} must be a boolean.`);
  }
  return value;
}

export function toIsoTimestamp(date = new Date()) {
  return date.toISOString();
}
