import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const metadata = {
  title: 'Admin | ScarborMusic',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card px-6 py-4">
          <h1 className="text-sm font-medium text-muted-foreground">Operations Console</h1>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
