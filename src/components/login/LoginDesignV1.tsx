"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { User, Lock, ArrowRight, Shield, GripHorizontal, Mail, MessageCircle, X } from "lucide-react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

/** Option 1 — the previous login design (draggable card over a background). */
export function LoginDesignV1() {
  const [state, formAction, pending] = useActionState(login, initialState);

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function handlePointerMove(e: PointerEvent) {
      setPos({
        x: dragStart.current.posX + (e.clientX - dragStart.current.x),
        y: dragStart.current.posY + (e.clientY - dragStart.current.y),
      });
    }
    function handlePointerUp() {
      setDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging]);

  return (
    <div className="min-h-screen relative flex items-center justify-end px-4 lg:pr-[8%] overflow-hidden bg-[#eef2f7]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.gif')" }}
      />
      <div className="absolute inset-0 bg-black/25" />

      <div
        className={`relative w-full max-w-sm ${dragging ? "" : "transition-transform duration-150"}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl">
          <div
            onPointerDown={handlePointerDown}
            className={`h-6 bg-gradient-to-r from-tamco-blue to-cyan-400 flex items-center justify-center touch-none ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <GripHorizontal size={14} className="text-white/70" />
          </div>
          <div className="absolute right-4 top-9 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <Shield size={15} />
          </div>

          <div className="px-8 pt-8 pb-8">
            <div className="text-center mb-7">
              <Image
                src="/tamco-logo.png"
                alt="TAMCO"
                width={1024}
                height={305}
                priority
                unoptimized
                className="h-11 w-auto mx-auto"
              />
              <p className="text-[11px] font-medium tracking-[0.25em] text-gray-400 mt-1.5">LEARNING HUB</p>
              <h1 className="text-lg font-semibold text-tamco-navy mt-4">Sign in to continue</h1>
              <p className="text-xs text-gray-400 mt-1">TAMCO Switchgear (Malaysia) Sdn Bhd</p>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label
                  htmlFor="staffNo"
                  className="block text-[11px] font-semibold tracking-wide text-gray-400 uppercase mb-1.5"
                >
                  Staff ID
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="staffNo"
                    name="staffNo"
                    autoComplete="username"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tamco-blue focus:border-tamco-blue"
                    placeholder="e.g. T1234"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-semibold tracking-wide text-gray-400 uppercase mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tamco-blue focus:border-tamco-blue"
                    placeholder="Enter your password"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="mt-1.5 text-xs text-tamco-blue hover:text-tamco-blue-dark hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {state.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-tamco-blue to-cyan-500 hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold py-3 transition-opacity"
              >
                {pending ? "Signing in..." : "Sign in"}
                {!pending && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowForgotPassword(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-white shadow-xl p-6"
          >
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-semibold text-tamco-navy mb-1">Forgot your password?</h2>
            <p className="text-sm text-gray-500 mb-5">
              Please reach out and we&apos;ll help you get back in.
            </p>

            <div className="space-y-3">
              <a
                href="mailto:muhammad.norfikri@tamco.com.my"
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <Mail size={16} className="text-tamco-blue shrink-0" />
                <span className="text-sm text-gray-700">muhammad.norfikri@tamco.com.my</span>
              </a>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5">
                <MessageCircle size={16} className="text-tamco-blue shrink-0" />
                <span className="text-sm text-gray-700">Chat me through Teams</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-tamco-blue to-cyan-500 hover:opacity-90 text-white text-sm font-semibold py-2.5 transition-opacity"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
