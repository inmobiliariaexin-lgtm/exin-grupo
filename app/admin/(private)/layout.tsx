import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin-shell'
import { getAdminContext } from '@/lib/admin-auth'
export const dynamic = 'force-dynamic'
export default async function PrivateAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await getAdminContext()
  if (!context) redirect('/admin/login')
  return <AdminShell name={context.profile.full_name} role={context.profile.role}>{children}</AdminShell>
}
