"use client";

import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, loading, signInWithGoogle, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-serif animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        {/* Brand / Logo Area */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-24 w-24 rounded-full bg-primary neo-border flex items-center justify-center">
             <span className="text-4xl">💌</span>
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            May I Meet You?
          </h1>
          <p className="font-sans text-xl md:text-2xl max-w-md leading-relaxed">
            The <span className="bg-accent px-2 py-0.5 rounded-md neo-border text-base align-middle">rom-com</span> worthy dating app you've been waiting for.
          </p>
        </div>

        {/* Action Area */}
        <div className="mt-8 w-full max-w-xs">
          {user ? (
            <div className="flex flex-col items-center gap-6 rounded-xl bg-white neo-border p-8">
              <div className="flex flex-col items-center gap-2">
                {user.photoURL && (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "User"} 
                    className="w-20 h-20 rounded-full neo-border object-cover"
                  />
                )}
                <p className="text-lg font-medium">
                  Hi, {user.displayName?.split(' ')[0]}!
                </p>
              </div>
              
              <div className="flex flex-col w-full gap-3">
                <button className="w-full rounded-xl bg-secondary py-3 font-bold neo-border hover:brightness-95 transition-all">
                  Start Matching
                </button>
                <button
                  onClick={logout}
                  className="w-full rounded-xl bg-white py-3 font-bold neo-border hover:bg-gray-50 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                onClick={signInWithGoogle}
                className="group relative w-full overflow-hidden rounded-xl bg-primary px-8 py-4 font-bold text-white neo-border hover:bg-primary-hover transition-colors"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                  Sign In with Google
                </span>
              </button>
              <p className="text-sm text-center opacity-60">
                No passwords, just vibes.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
