import React, { useState } from "react";
import { Terminal, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Play } from "lucide-react";
import { loginApi } from "../services/api";
import { User } from "../types";

interface LoginPageProps {
  onSuccess: (user: User) => void;
  onNavigateRegister: () => void;
  onEnterDemo?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateRegister,
  onEnterDemo,
}) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await loginApi({ email, password });
    setIsLoading(false);

    if (res.success && res.data) {
      onSuccess(res.data.user);
    } else {
      setError(res.error || "Invalid email or password.");
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex flex-col items-center justify-center p-4 font-mono text-xs text-[#D8D8DC]">
      <div className="w-full max-w-md bg-[#111113] border border-[#29292D] rounded-lg p-7 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded bg-[#161619] border border-[#29292D] flex items-center justify-center">
              <Terminal className="w-4 h-4 text-[#C98A3D]" />
            </div>
            <span className="text-base font-bold text-[#D8D8DC] tracking-wider">ATLAS</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#161619] text-[#77777D] border border-[#29292D]">
              v0.6.0
            </span>
          </div>
          <p className="text-[11px] text-[#77777D]">
            API Engineering Workbench • Authenticate to continue
          </p>
        </div>

        {/* Recruiter / Public Demo Callout */}
        {onEnterDemo && (
          <div className="p-3 bg-[#C98A3D]/10 border border-[#C98A3D]/30 rounded space-y-2">
            <div className="flex items-center space-x-1.5 text-[#C98A3D] font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-[#C98A3D] shrink-0" />
              <span>Recruiter & Public Preview</span>
            </div>
            <p className="text-[11px] text-[#77777D] leading-relaxed">
              Explore the full interactive engineering workbench preloaded with the dense Atlas Workflow API v1.0.0 without creating an account.
            </p>
            <button
              onClick={onEnterDemo}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded bg-[#C98A3D] hover:bg-[#DCA052] text-[#0B0B0D] text-[11px] font-bold transition-colors shadow"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Launch Interactive Demo Mode</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded bg-[#E06C75]/10 border border-[#E06C75]/30 text-[#E06C75] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-[#E06C75] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] text-[#77777D] uppercase font-bold mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#77777D] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@atlas.dev"
                className="w-full bg-[#0B0B0D] border border-[#29292D] rounded pl-9 pr-3 py-2 text-xs text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D] transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[#77777D] uppercase font-bold mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[#77777D] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0B0B0D] border border-[#29292D] rounded pl-9 pr-3 py-2 text-xs text-[#D8D8DC] placeholder-[#77777D]/50 focus:outline-none focus:border-[#C98A3D] transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-2 rounded bg-[#161619] hover:bg-[#202024] border border-[#29292D] hover:border-[#C98A3D]/50 text-xs font-semibold text-[#D8D8DC] transition-colors disabled:opacity-50"
          >
            <span>{isLoading ? "Authenticating..." : "Sign In to Workbench"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C98A3D]" />
          </button>
        </form>

        {/* Switch to Register */}
        <div className="text-center pt-2 border-t border-[#29292D]">
          <p className="text-[11px] text-[#77777D]">
            Don't have an account?{" "}
            <button
              onClick={onNavigateRegister}
              className="text-[#C98A3D] hover:text-[#DCA052] font-medium underline ml-1"
            >
              Create an account
            </button>
          </p>
        </div>

        {/* Quick Demo Credentials Pre-fill */}
        <div className="bg-[#0B0B0D] border border-[#29292D] rounded p-2.5 text-[10px] text-[#77777D] space-y-1">
          <span className="text-[#D8D8DC] font-semibold uppercase">Development Seed User:</span>
          <p className="text-[#77777D]">
            Click to fill credentials:{" "}
            <button
              onClick={() => handleDemoLogin("alice@test.com", "securePassword123!")}
              className="text-[#C98A3D] hover:underline font-mono"
            >
              alice@test.com
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
