import { useState } from "react"
import { useUsers } from "@/api/hooks/useUsers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AssigneeSelectorProps {
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

function getInitials(firstName: string, lastName: string, email: string) {
  const f = firstName?.[0] ?? ""
  const l = lastName?.[0] ?? ""
  return (f + l).toUpperCase() || (email?.[0] ?? "U").toUpperCase()
}

function getUserName(firstName: string, lastName: string, email: string) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || email
}

export function AssigneeSelector({ value, onChange, disabled }: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false)
  const { data: users } = useUsers()

  const toggle = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId))
    } else {
      onChange([...value, userId])
    }
  }

  const assignedUsers = (users ?? []).filter((u) => value.includes(u.id))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 min-h-[28px] rounded-md px-1.5 py-1",
            "hover:bg-accent transition-colors text-left",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          {assignedUsers.length === 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </span>
          ) : (
            <div className="flex items-center gap-1">
              {/* Stacked avatars — show up to 3, then +N */}
              <div className="flex -space-x-1.5">
                {assignedUsers.slice(0, 3).map((u) => (
                  <Avatar
                    key={u.id}
                    className="h-5 w-5 border border-background ring-0"
                  >
                    <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {getInitials(u.first_name, u.last_name, u.email)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {assignedUsers.length > 3 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  +{assignedUsers.length - 3}
                </span>
              )}
              <span className="text-xs text-foreground ml-1 hidden sm:inline">
                {assignedUsers.length === 1
                  ? getUserName(assignedUsers[0].first_name, assignedUsers[0].last_name, assignedUsers[0].email)
                  : `${assignedUsers.length} assignees`}
              </span>
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-4">No users found.</CommandEmpty>
            <CommandGroup>
              {(users ?? []).map((user) => {
                const selected = value.includes(user.id)
                const name = getUserName(user.first_name, user.last_name, user.email)
                const initials = getInitials(user.first_name, user.last_name, user.email)
                return (
                  <CommandItem
                    key={user.id}
                    value={name}
                    onSelect={() => toggle(user.id)}
                    className="gap-2 py-1.5"
                  >
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Check className={cn("h-3.5 w-3.5 shrink-0", selected ? "opacity-100 text-indigo-500" : "opacity-0")} />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
