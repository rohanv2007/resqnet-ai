import { Shield } from "lucide-react";

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_0.85fr]">
      <section
        className="relative hidden overflow-hidden bg-cover bg-center lg:block"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(4,47,46,0.88), rgba(15,118,110,0.62)), url('https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <div className="mb-8 h-px w-40 bg-white/40" />
          <p className="max-w-xl text-3xl font-semibold leading-tight">
            Hyperlocal disaster intelligence for faster public response.
          </p>
          <p className="mt-4 max-w-lg text-sm text-white/75">
            Mock feeds for Kerala floods, Odisha cyclones, urban fire response,
            shelters, reports, and alert delivery.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">ResQNet</p>
              <p className="text-xs text-muted-foreground">
                Disaster Intelligence Platform
              </p>
            </div>
          </div>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
