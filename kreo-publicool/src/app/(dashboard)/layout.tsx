import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(id, name, slug, plan)')
    .eq('user_id', user.id)
    .single()

  const org = member?.organizations as { id: string; name: string; plan: string } | null
  const meta = user.user_metadata ?? {}
  const displayName = (meta.full_name as string) || user.email || ''
  const userInitial = displayName[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <DashboardSidebar
        orgName={org?.name ?? 'Mi Organización'}
        orgPlan={org?.plan ?? 'free'}
        userInitial={userInitial}
        userEmail={user.email}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end gap-3 flex-shrink-0">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <div
            className="w-8 h-8 bg-violet-200 rounded-full flex items-center justify-center text-xs font-black text-violet-700"
            title={user.email}
          >
            {userInitial}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
