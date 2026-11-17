import type { ReactNode } from 'react'
import { Building2, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export function AppShell({ email, children }: { email?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Building2 className="size-5" />
            Seller Intelligence Platform
          </div>
          {email && (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden opacity-80 sm:inline">{email}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => supabase?.auth.signOut()}
              >
                <LogOut /> Sign out
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
