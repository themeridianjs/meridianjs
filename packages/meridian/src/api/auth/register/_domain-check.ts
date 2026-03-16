export function validateEmailDomain(email: string, allowedDomains: string[]): void {
  if (allowedDomains.includes("*")) return
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain || !allowedDomains.map(d => d.toLowerCase()).includes(domain)) {
    throw Object.assign(
      new Error(`Email domain not allowed. Allowed: ${allowedDomains.join(", ")}`),
      { status: 422 }
    )
  }
}
