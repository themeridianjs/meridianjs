export function getAppName(): string {
  return window.__MERIDIAN_CONFIG__?.appName ?? "Meridian"
}

export function getLogoUrl(): string | undefined {
  return window.__MERIDIAN_CONFIG__?.logoUrl
}
