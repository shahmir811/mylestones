import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <main className="text-center space-y-6">
        <h1 className="text-4xl font-semibold text-slate-900">mylestones</h1>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
