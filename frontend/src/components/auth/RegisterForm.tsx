"use client";

import { useState } from "react";
import { useRegisterMutation } from "@/services/authApi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Button from "@/components/common/Button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: { message?: unknown } }).data?.message === "string"
  ) {
    return (error as { data: { message: string } }).data.message;
  }
  return "Registration failed. Please try again.";
};

const getPasswordErrors = (pw: string) => ({
  minLength: pw.length >= 8,
  hasUpper: /[A-Z]/.test(pw),
  hasNumber: /[0-9]/.test(pw),
});

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [register, { isLoading, error }] = useRegisterMutation();
  const router = useRouter();
  const pwErrors = getPasswordErrors(password);

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!EMAIL_REGEX.test(email)) errs.email = "Invalid email format";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register({ name, email, password }).unwrap();
      router.push("/login");
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  const clearError = (field: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xl font-bold mb-3">
            T
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create your account
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Start managing your tasks with a free account.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-name">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError('name'); }}
                  className={`w-full pl-10 pr-3 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${fieldErrors.name ? 'border-red-500' : 'border-gray-200'}`}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  required
                />
              </div>
              {fieldErrors.name && <p id="name-error" className="mt-1 text-sm text-red-500">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                  className={`w-full pl-10 pr-3 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${fieldErrors.email ? 'border-red-500' : 'border-gray-200'}`}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  required
                />
              </div>
              {fieldErrors.email && <p id="email-error" className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${fieldErrors.password ? 'border-red-500' : 'border-gray-200'}`}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p id="password-error" className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {[
                  { check: pwErrors.minLength, label: "8+ characters" },
                  { check: pwErrors.hasUpper, label: "1 uppercase" },
                  { check: pwErrors.hasNumber, label: "1 number" },
                ].map((item) => (
                  <span key={item.label} className={`flex items-center gap-1 ${item.check ? 'text-green-600' : 'text-gray-400'}`}>
                    {item.check ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm" role="alert">
                {getErrorMessage(error)}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
