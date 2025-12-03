// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import api from "../api/client";
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import { registerSchema } from "../validation/authSchemas";

import "../styles/theme.css";
import "../styles/register.css";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  const handleRegister = async () => {
    const result = registerSchema.safeParse({ email, password, confirm });

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirm: fieldErrors.confirm?.[0],
      });
      setStatus("");
      return;
    }

    setErrors({});
    setLoading(true);
    setStatus("");

    try {
      await api.post("/auth/register", {
        email,
        password,
      });

     
      setStatus("User registered successfully. Redirecting to login...");
      onSwitchToLogin();
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.message || "Registration failed. Try again.";
        console.log("Error message:", msg)
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>Main App – Register</h2>
        <p className="register-subtitle">
          Create your account. MFA key will be generated later from Dashboard
          when you try to perform actions.
        </p>

        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(val) => {
            setEmail(val);
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="you@example.com"
        />
        {errors.email && <small className="error-text">{errors.email}</small>}

        <TextInput
          label="Password"
          type="password"
          value={password}
          onChange={(val) => {
            setPassword(val);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
        />
        {errors.password && (
          <small className="error-text">{errors.password}</small>
        )}

        <TextInput
          label="Confirm Password"
          type="password"
          value={confirm}
          onChange={(val) => {
            setConfirm(val);
            setErrors((prev) => ({ ...prev, confirm: undefined }));
          }}
        />
        {errors.confirm && (
          <small className="error-text">{errors.confirm}</small>
        )}

        <Button onClick={handleRegister} loading={loading}>
          Register
        </Button>

        <p className="register-footer">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="link-button"
          >
            Go to Login
          </button>
        </p>

        {status && <p className="register-status">{status}</p>}
      </div>
    </div>
  );
};

export default RegisterPage;
