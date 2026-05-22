import Link from 'next/link'

export default function AdminForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-muted-foreground/40">403</p>
      <h1 className="mt-4 text-2xl font-semibold">Access Denied</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        You do not have permission to access the admin console. Only administrators can view this
        area.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Return Home
      </Link>
    </div>
  )
}
