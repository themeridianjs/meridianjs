import { createRemoteJWKSet, jwtVerify } from "jose"

export interface GoogleOAuthOptions {
  clientId: string
  clientSecret: string
  callbackUrl: string
  frontendUrl: string
}

export interface GoogleProfile {
  googleId: string
  email: string
  firstName: string | null
  lastName: string | null
  picture: string | null
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]

export class GoogleOAuthService {
  private readonly options: GoogleOAuthOptions
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>

  constructor(container: any) {
    this.options = container.resolve("moduleOptions") as GoogleOAuthOptions

    // Validate frontendUrl at boot — an invalid value would cause open redirects
    try {
      const parsed = new URL(this.options.frontendUrl)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("must be http or https")
      }
    } catch {
      throw new Error(
        `[google-oauth] Invalid frontendUrl: "${this.options.frontendUrl}". ` +
        "Must be a valid http:// or https:// URL."
      )
    }

    // Create a cached JWK set for id_token signature verification
    this.jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL))
  }

  /** Build the Google OAuth authorization URL with the given state parameter. */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
    })
    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  }

  /**
   * Exchange an authorization code for a GoogleProfile.
   * Verifies the id_token signature against Google's JWK keyset per
   * https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
   */
  async exchangeCode(code: string): Promise<GoogleProfile> {
    const body = new URLSearchParams({
      code,
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      redirect_uri: this.options.callbackUrl,
      grant_type: "authorization_code",
    })

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "")
      throw Object.assign(new Error(`Google token exchange failed: ${text}`), { status: 502 })
    }

    const tokenData = await tokenRes.json() as { id_token?: string }

    if (!tokenData.id_token) {
      throw Object.assign(new Error("Google did not return an id_token"), { status: 502 })
    }

    // Verify signature, audience, and issuer
    let payload: Record<string, unknown>
    try {
      const { payload: verified } = await jwtVerify(tokenData.id_token, this.jwks, {
        audience: this.options.clientId,
        issuer: GOOGLE_ISSUERS,
      })
      payload = verified as Record<string, unknown>
    } catch (err: any) {
      throw Object.assign(
        new Error(`id_token verification failed: ${err.message ?? "invalid token"}`),
        { status: 502 }
      )
    }

    if (!payload.email_verified) {
      throw Object.assign(new Error("Google email address is not verified"), { status: 403 })
    }

    return {
      googleId: payload.sub as string,
      email: payload.email as string,
      firstName: (payload.given_name as string | undefined) ?? null,
      lastName: (payload.family_name as string | undefined) ?? null,
      picture: (payload.picture as string | undefined) ?? null,
    }
  }

  get frontendUrl(): string {
    return this.options.frontendUrl
  }
}
