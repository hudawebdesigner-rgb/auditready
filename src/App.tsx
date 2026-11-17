import { AppShell } from '@/components/AppShell'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useSession } from '@/lib/useSession'
import { LoginPage } from '@/pages/LoginPage'
import { SetupCheckPage } from '@/pages/SetupCheckPage'

export default function App() {
  const session = useSession()

  if (session === undefined) {
    return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>
  }

  return (
    <AppShell email={session?.user.email}>
      {session || !isSupabaseConfigured ? (
        <SetupCheckPage session={session} />
      ) : (
        <div className="grid gap-8">
          <LoginPage />
          <SetupCheckPage session={null} />
        </div>
      )}
    </AppShell>
  )
}
