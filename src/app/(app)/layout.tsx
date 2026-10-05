import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/60 antialiased selection:bg-blue-600 selection:text-white">
      <Sidebar />
      <main className="lg:pl-72 min-h-screen flex flex-col">
        <div className="flex-1 px-4 py-8 sm:px-8 lg:px-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

