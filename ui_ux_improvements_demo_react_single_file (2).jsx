import React, { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

/*
  UI/UX Improvements — Firebase-safe React single-file demo

  What I changed and why:
  - Added robust checks to detect invalid / placeholder Firebase config and provide clear UI messages.
  - Delay calling getAuth() until initializeApp() has successfully run.
  - Provide a "Demo mode" fallback so you can test UI flows without Firebase configured.
  - Improved error messages and included instructions for using environment variables (.env with REACT_APP_*)

  How to use:
  1. Install deps: npm install firebase recharts framer-motion
  2. Provide a valid Firebase config via environment variables (recommended) or replace the inline placeholders.
     Example .env (in project root):

     REACT_APP_FIREBASE_API_KEY=your_api_key_here
     REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     REACT_APP_FIREBASE_PROJECT_ID=your-project-id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
     REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
     REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXX

  3. Restart your dev server so env vars are picked up.

  If you don't want to set up Firebase right now, toggle "Demo mode" in the UI — this uses an in-memory fake auth so you can validate the UI and form flows.
*/

// Try to read config from environment variables (works with Create React App / Vite if prefixed correctly).
const env = typeof process !== "undefined" ? process.env : {};
const envConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.REACT_APP_FIREBASE_APP_ID || "",
  measurementId: env.REACT_APP_FIREBASE_MEASUREMENT_ID || "",
};

// Inline fallback (placeholders) — you can replace this object directly with your Firebase config if you prefer.
const firebaseConfig = {
  apiKey: "AIzaSyAEjghumiTQLVF4jD8rHIVkhZJGLEIgxCg",
  authDomain: "uiuxdemo-8b903.firebaseapp.com",
  projectId: "uiuxdemo-8b903",
  storageBucket: "uiuxdemo-8b903.firebasestorage.app",
  messagingSenderId: "640878997027",
  appId: "1:640878997027:web:98028ad96a68c0e0eacb96",
  measurementId: "G-E2NDVMKPWL"
};

// Prefer environment config when present
const firebaseConfig = envConfig.apiKey ? envConfig : inlineConfig;

function isConfigValid(cfg) {
  if (!cfg || typeof cfg !== "object") return false;
  // basic checks — ensure required fields are present and are not placeholders
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  for (const k of required) {
    if (!cfg[k] || typeof cfg[k] !== "string") return false;
    if (cfg[k].startsWith("YOUR_") || cfg[k].trim() === "") return false;
  }
  // apiKey length heuristic
  if (cfg.apiKey.length < 20) return false;
  return true;
}

function initFirebaseSafe() {
  // Validate config first — don't even try to initialize if it looks like placeholders
  if (!isConfigValid(firebaseConfig)) {
    throw new Error(
      "Invalid Firebase config. Provide valid values via environment variables (REACT_APP_FIREBASE_*) or replace the inline firebaseConfig object in the file."
    );
  }

  // Only initialize once (safe for HMR / multiple imports)
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    console.debug("Firebase initialized for project:", firebaseConfig.projectId);
    return getAuth(app);
  }

  // If already initialized, return the auth for the first app
  const auth = getAuth();
  return auth;
}

export default function App() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState(null);
  const [initError, setInitError] = useState(null);
  const [demoMode, setDemoMode] = useState(!isConfigValid(firebaseConfig));

  // In-memory demo users (for Demo mode testing)
  const [demoUsers, setDemoUsers] = useState({});

  useEffect(() => {
    if (demoMode) {
      setInitError(null);
      return;
    }

    // Try to initialize Firebase on mount
    try {
      const _auth = initFirebaseSafe();
      setAuth(_auth);
      setInitError(null);
    } catch (err) {
      console.error("Firebase init error:", err);
      setInitError(err.message || String(err));
      setAuth(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  const activityData = [
    { day: "Mon", signups: 12, logins: 120 },
    { day: "Tue", signups: 20, logins: 200 },
    { day: "Wed", signups: 8, logins: 90 },
    { day: "Thu", signups: 18, logins: 160 },
    { day: "Fri", signups: 30, logins: 300 },
    { day: "Sat", signups: 5, logins: 60 },
    { day: "Sun", signups: 2, logins: 40 },
  ];

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][passwordScore];
  const passwordColor = ["bg-red-600", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500", "bg-green-700"][passwordScore];

  function validate() {
    const next = {};
    if (!email) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Password must be at least 8 characters.";
    else if (passwordScore < 3) next.password = "Password is weak.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Demo-mode helpers (simulate network delay)
  function demoDelay(ms = 600) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async function demoSignUp(email, password) {
    await demoDelay();
    if (demoUsers[email]) {
      const err = new Error("Email already in use");
      err.code = "auth/email-already-in-use";
      throw err;
    }
    setDemoUsers((prev) => ({ ...prev, [email]: { password, createdAt: Date.now() } }));
    return { user: { email } };
  }

  async function demoSignIn(email, password) {
    await demoDelay();
    const u = demoUsers[email];
    if (!u) {
      const err = new Error("User not found");
      err.code = "auth/user-not-found";
      throw err;
    }
    if (u.password !== password) {
      const err = new Error("Wrong password");
      err.code = "auth/wrong-password";
      throw err;
    }
    return { user: { email } };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (demoMode) {
        if (isLogin) {
          await demoSignIn(email, password);
          alert("Demo login successful ✅");
        } else {
          await demoSignUp(email, password);
          alert("Demo account created ✅");
        }
        return;
      }

      // For real Firebase flows, ensure auth is initialized
      let firebaseAuth = auth;
      if (!firebaseAuth) {
        // try to initialize lazily (this will throw if config invalid)
        try {
          firebaseAuth = initFirebaseSafe();
          setAuth(firebaseAuth);
        } catch (err) {
          setInitError(err.message || String(err));
          alert("Firebase not initialized properly. See the banner at the top for instructions.");
          return;
        }
      }

      if (isLogin) {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
        alert("Login successful ✅");
      } else {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
        alert("Account created successfully ✅");
      }
    } catch (err) {
      console.error("Auth error:", err);
      if (err.code === "auth/email-already-in-use") {
        alert("This email is already in use. Try logging in or use a different email.");
      } else if (err.code === "auth/invalid-email") {
        alert("Invalid email address.");
      } else if (err.code === "auth/wrong-password") {
        alert("Incorrect password.");
      } else if (err.code === "auth/user-not-found") {
        alert("No account found for this email.");
      } else {
        alert(`Error: ${err.message || String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-900">
      <header className="max-w-6xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">Firebase Login Demo — Robust Init</h1>
        <p className="mt-1 text-sm text-gray-600">Responsive UI with password strength, accessibility, and safe Firebase initialization.</p>

        {/* Top banner: show configuration / error information */}
        <div className="mt-3 flex items-start gap-4">
          <div>
            <button
              onClick={() => setDemoMode((d) => !d)}
              className="px-3 py-1 rounded-md border text-sm"
            >
              {demoMode ? "Using Demo Mode" : "Use Demo Mode"}
            </button>
          </div>

          {initError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <strong>Firebase init error:</strong>
              <div>{initError}</div>
              <div className="mt-2">Make sure you set your Firebase config. Example (.env):</div>
              <pre className="mt-1 text-xs bg-white p-2 rounded">REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXX</pre>
            </div>
          )}

          {!initError && !demoMode && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">Firebase appears configured and will be used for auth.</div>
          )}

          {demoMode && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">Demo mode enabled — no network calls will be made.</div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="col-span-1 md:col-span-2 bg-white shadow-lg rounded-2xl p-6" aria-labelledby="form-title">
          <h2 id="form-title" className="text-xl font-medium">{isLogin ? "Login" : "Create account"}</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-invalid={errors.email ? "true" : "false"}
                className={`mt-1 block w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.email ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.email && <p id="email-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="pw-help pw-strength"
                aria-invalid={errors.password ? "true" : "false"}
                className={`mt-1 block w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.password ? "border-red-500" : "border-gray-300"}`}
              />
              <div id="pw-help" className="mt-2 text-xs text-gray-600">Use 8+ characters with a mix of letters, numbers and symbols.</div>

              <div className="mt-3" aria-hidden>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 transition-all duration-200 ${passwordColor}`} style={{ width: `${(passwordScore / 5) * 100}%` }} />
                </div>
                <div id="pw-strength" className="mt-1 flex items-center justify-between text-sm">
                  <div className="sr-only">Password strength: {strengthLabel}</div>
                  <span className="font-medium">Strength:</span>
                  <span className="font-semibold">{strengthLabel}</span>
                </div>
              </div>

              {errors.password && <p id="password-error" role="alert" aria-live="polite" className="mt-2 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-indigo-600 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">{loading ? "Please wait..." : (isLogin ? "Login" : "Sign Up")}</button>
              <div className="text-sm text-gray-600">
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 underline">{isLogin ? "Need an account? Sign up" : "Already have an account? Login"}</button>
              </div>
            </div>
          </form>

          {/* Small demo controls (test cases) */}
          <div className="mt-6 text-sm text-gray-700">
            <strong>Quick tests:</strong>
            <ul className="list-disc pl-5 mt-2">
              <li>Toggle <em>Demo mode</em> to verify UI flows without Firebase.</li>
              <li>Try signing up and logging in with demo mode to confirm validation, error states and success alerts.</li>
            </ul>
          </div>
        </section>

        <aside className="col-span-1 bg-white shadow-lg rounded-2xl p-4">
          <h3 className="text-lg font-medium">Admin — Weekly activity</h3>
          <p className="text-sm text-gray-600">Hover / tap the chart to inspect values.</p>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="logins" stroke="#4f46e5" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="signups" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4">
            <details className="text-sm">
              <summary className="cursor-pointer">Accessibility notes</summary>
              <ul className="mt-2 list-disc pl-5 text-xs text-gray-700">
                <li>Form fields include <code>aria-describedby</code> and <code>aria-invalid</code>.</li>
                <li>Errors use <code>role="alert"</code> and <code>aria-live</code> for screen readers.</li>
                <li>Color contrast uses strong foregrounds and backgrounds—avoid using color alone to convey meaning.</li>
              </ul>
            </details>
          </div>
        </aside>
      </main>

      <footer className="max-w-6xl mx-auto mt-8 text-center text-xs text-gray-500">Demo — implement validation & server-side checks before production.</footer>
    </div>
  );
}
