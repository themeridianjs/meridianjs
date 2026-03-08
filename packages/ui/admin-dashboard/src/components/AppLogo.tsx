import { getAppName, getLogoUrl } from "@/lib/branding"

export function AppLogo({ className }: { className?: string }) {
  const logoUrl = getLogoUrl()

  if (logoUrl) {
    return <img src={logoUrl} alt={getAppName()} className={className ?? "h-12 w-12"} />
  }

  return (
    <div className={className ?? "relative h-16 w-16 rounded-2xl bg-white dark:bg-card border border-border shadow-sm flex items-center justify-center"}>
      <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
        <div className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-background/60" />
        </div>
      </div>
    </div>
  )
}
