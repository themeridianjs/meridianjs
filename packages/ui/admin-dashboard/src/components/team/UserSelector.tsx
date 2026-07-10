import { useState } from "react"
import { useAllUsers } from "@/api/hooks/useUsers"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface UserSelectorProps {
  value: string | null
  onChange: (userId: string) => void
}

function getInitials(firstName: string, lastName: string, email: string) {
  const f = firstName?.[0] ?? ""
  const l = lastName?.[0] ?? ""
  return (f + l).toUpperCase() || (email?.[0] ?? "U").toUpperCase()
}

function getUserName(firstName: string, lastName: string, email: string) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || email
}

export function UserSelector({ value, onChange }: UserSelectorProps) {
  const [open, setOpen] = useState(false)
  const { data: allUsers } = useAllUsers()

  // Hide deactivated users from the picker, but still resolve a previously
  // selected (now-deactivated) user's name for display.
  const users = (allUsers ?? []).filter((u) => u.is_active !== false)
  const selectedUser = value ? (allUsers ?? []).find((u) => u.id === value) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-3 py-1.5",
            "hover:bg-accent transition-colors text-left min-w-[220px]",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
        >
          {selectedUser ? (
            <>
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {getInitials(selectedUser.first_name, selectedUser.last_name, selectedUser.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground truncate">
                {getUserName(selectedUser.first_name, selectedUser.last_name, selectedUser.email)}
              </span>
            </>
          ) : (
            <>
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Select a team member...</span>
            </>
          )}
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or email..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-4">No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => {
                const selected = value === user.id
                const name = getUserName(user.first_name, user.last_name, user.email)
                const initials = getInitials(user.first_name, user.last_name, user.email)
                return (
                  <CommandItem
                    key={user.id}
                    value={`${name} ${user.email}`}
                    onSelect={() => {
                      onChange(user.id)
                      setOpen(false)
                    }}
                    className="gap-2 py-1.5"
                  >
                    <Avatar className="h-6 w-6 shrink-0">
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
