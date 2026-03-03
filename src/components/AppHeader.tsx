import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'

export default function AppHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-50 w-full h-14 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-soft">
      {/* Brand — matches landing Navbar */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-coral flex items-center justify-center shadow-coral">
          <span className="text-primary-foreground font-serif text-base font-bold">T</span>
        </div>
        <span className="font-serif text-xl text-foreground">Tello</span>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Open account menu"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60 focus-visible:ring-offset-2 transition-transform duration-150 active:scale-95"
          >
            <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity duration-150">
              <AvatarFallback className="bg-coral/15 text-coral text-sm font-medium font-sans">
                {initial}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-xs text-muted-foreground font-sans mb-0.5">Signed in as</p>
            <p className="text-sm font-medium font-sans text-foreground truncate">
              {user?.email ?? '—'}
            </p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive focus:bg-destructive/8 cursor-pointer font-sans gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
