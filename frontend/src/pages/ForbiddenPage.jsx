import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../components/shared/ui'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#F2F5FA] p-4">
      <div className="w-full max-w-md rounded-xl border border-[#E6EAF2] bg-white p-5 text-center shadow-soft sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">403</h1>
        <p className="mt-2 text-slate-600">You do not have permission to access this page.</p>
        <Link to="/dashboard" className="mt-6 block">
          <Button type="button">Return to dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
