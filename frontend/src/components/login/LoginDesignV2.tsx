"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { User, Lock, ArrowRight, Mail, MessageCircle, X } from "lucide-react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

const inputClass =
  "w-full rounded-lg border border-[#dbe6f4] bg-[#eef3fb] pl-9 pr-3 py-2 text-sm text-[#1f2a3a] " +
  "placeholder:text-[#9fb0c6] transition-colors focus:border-[#1b75bc] focus:bg-white focus:outline-none " +
  "focus:ring-2 focus:ring-[#1b75bc]/35";

const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400";

/** Option 2 — split-screen layout with an illustration; form styled like the classic TAMCO card. */
export function LoginDesignV2() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#DCDDE1] p-4 sm:p-6 lg:p-10">
      <div className="flex w-full max-w-[1360px] flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_24px_70px_-28px_rgba(31,41,55,0.28)] lg:h-[86vh] lg:max-h-[880px] lg:flex-row">
        {/* Visual panel — desktop only */}
        <div className="hidden shrink-0 overflow-hidden bg-[#F5F6F8] lg:block lg:w-[64%]">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed visual */}
          <img src="/login-visual.jpg" alt="" className="h-full w-full object-cover" />
        </div>

        {/* Form panel */}
        <div className="flex w-full flex-col justify-center px-8 py-10 sm:px-12 lg:w-[36%] lg:py-0 xl:px-14">
          <div className="mb-6 text-center">
            <Image
              src="/tamco-logo-full.png"
              alt="TAMCO"
              width={1024}
              height={305}
              priority
              unoptimized
              className="mx-auto h-16 w-auto"
            />
            <p className="mt-2 text-[10px] font-medium tracking-[0.22em] text-gray-400">LEARNING HUB</p>
            <h1 className="mt-4 text-lg font-semibold text-[#0a2d5e]">Sign in to continue</h1>
            <p className="mt-0.5 text-[11px] text-gray-400">TAMCO Switchgear (Malaysia) Sdn Bhd</p>
          </div>

          <form action={formAction} className="space-y-3">
            <div>
              <label htmlFor="staffNo" className={labelClass}>
                Staff ID
              </label>
              <div className="relative">
                <User size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="staffNo"
                  name="staffNo"
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="e.g. 001234"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="mt-1 text-[11px] font-medium text-[#1b75bc] hover:text-[#145a91] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {state.error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1b75bc] to-[#22b8e6] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Signing in..." : "Sign in"}
              {!pending && <ArrowRight size={15} />}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-gray-400">
            Need help accessing your account?{" "}
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="font-medium text-[#1b75bc] hover:text-[#145a91]"
            >
              Contact HR
            </button>
          </p>
        </div>
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h2 className="mb-1 text-base font-semibold text-[#0a2d5e]">Need a hand?</h2>
            <p className="mb-5 text-sm text-gray-500">Contact HR to reset your password or sort out access.</p>

            <div className="space-y-3">
              <a
                href="mailto:muhammad.norfikri@tamco.com.my"
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50"
              >
                <Mail size={16} className="shrink-0 text-[#1b75bc]" />
                <span className="text-sm text-gray-700">muhammad.norfikri@tamco.com.my</span>
              </a>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5">
                <MessageCircle size={16} className="shrink-0 text-[#1b75bc]" />
                <span className="text-sm text-gray-700">Chat with HR on Teams</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#1b75bc] to-[#22b8e6] py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
