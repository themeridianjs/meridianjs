import { useEffect, useRef } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getAvatarColor } from "@/components/issues/IssueActivity"
import { cn } from "@/lib/utils"

export interface MentionItem {
  id: string
  label: string
  email: string
}

interface MentionSuggestionProps {
  items: MentionItem[]
  selectedIndex: number
  onSelect: (item: MentionItem) => void
}

export function MentionSuggestion({ items, selectedIndex, onSelect }: MentionSuggestionProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    const selected = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    selected?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (items.length === 0) return null

  return (
    <div
      className={cn(
        "z-50 min-w-[220px] max-w-[280px] rounded-md border border-border",
        "bg-popover shadow-md overflow-hidden",
        "animate-in fade-in-0 zoom-in-95"
      )}
    >
      <div
        ref={listRef}
        className="max-h-[200px] overflow-y-auto p-1"
        role="listbox"
      >
        {items.map((item, index) => {
          const initials = item.label
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?"
          const color = getAvatarColor(item.label)
          return (
            <button
              key={item.id}
              data-index={index}
              role="option"
              aria-selected={index === selectedIndex}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(item)
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer",
                "transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/60"
              )}
            >
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarFallback className={cn("text-[9px] font-semibold", color.bg, color.text)}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0">
                <span className="font-medium text-foreground truncate leading-tight">{item.label}</span>
                <span className="text-[10px] text-muted-foreground truncate leading-tight">{item.email}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
