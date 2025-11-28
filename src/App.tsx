// src/App.tsx
import React, { useState } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RegisterPage from "./pages/RegisterPage";
import type { AuthState } from "./types/auth";
import { setAuthHeader } from "./api/client";

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleLogin = (data: AuthState) => {
    setAuth(data);
    setAuthHeader(data.token);
  };

  const handleAuthUpdate = (data: AuthState) => {
    // used when Dashboard does OTP login in background
    setAuth(data);
    setAuthHeader(data.token);
  };

  const handleLogout = () => {
    setAuth(null);
    setAuthHeader(null);
    setMode("login");
  };

  if (!auth) {
    if (mode === "login") {
      return (
        <LoginPage
          onLogin={handleLogin}
          onSwitchToRegister={() => setMode("register")}
        />
      );
    }
    return <RegisterPage onSwitchToLogin={() => setMode("login")} />;
  }

  return (
    <DashboardPage
      auth={auth}
      onLogout={handleLogout}
      onAuthUpdate={handleAuthUpdate}
    />
  );
};

export default App;
