import React, { useState } from "react";
import api from "../api/client";
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import type {
  AuthState,
  LoginResponseOtp,
  LoginResponsePassword,
  MfaStatusResponse,
} from "../types/auth";
import {
  checkAccountSchema,
  otpLoginSchema,
  passwordLoginSchema,
} from "../validation/authSchemas";

// CSS imports
import "../styles/theme.css";
import "../styles/login.css";

type Mode = "idle" | "password" | "otp";

interface LoginPageProps {
  onLogin: (auth: AuthState) => void;
  onSwitchToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [status, setStatus] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    otp?: string;
  }>({});

  // User chooses "Login with Password"
  const handleUsePasswordMode = () => {
    setMode("password");
    setStatus("");
  };

  // User chooses "Login with OTP"
  const handleUseOtpMode = async () => {
    const result = checkAccountSchema.safeParse({ email });

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();
      setErrors({
        email: fieldErrors.email?.[0],
      });
      setStatus("");
      return;
    }

    setErrors({});
    setLoading(true);
    setStatus("");
    setMode("idle");
    setPassword("");
    setOtp("");

    try {
      const res = await api.get<MfaStatusResponse>("/auth/mfa-status", {
        params: { email },
      });

      if (!res.data.exists) {
        setStatus("User not found. Please register first in the main app.");
        setMode("idle");
      } else if (!res.data.isMfaRegistered) {
        setStatus(
          "You are not registered with MFA. Register with MFA to login using OTP."
        );
        setMode("idle");
      } else {
        setStatus("MFA registered. Please enter OTP from Auth App.");
        setMode("otp");
      }
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong while checking your account.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    const result = passwordLoginSchema.safeParse({ email, password });

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      setStatus("");
      return;
    }

    setErrors({});
    setLoading(true);
    setStatus("");

    try {
      const res = await api.post<LoginResponsePassword>(
        "/auth/login/password",
        {
          email,
          password,
        }
      );

      onLogin({
        token: res.data.token,
        email: res.data.email,
        isMfaRegistered: res.data.isMfaRegistered,
        mfaVerified: false,
      });
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        "Password login failed. Check credentials.";
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async () => {
    const result = otpLoginSchema.safeParse({ email, otp });

    if (!result.success) {
      const { fieldErrors } = result.error.flatten();
      setErrors({
        email: fieldErrors.email?.[0],
        otp: fieldErrors.otp?.[0],
      });
      setStatus("");
      return;
    }

    setErrors({});
    setLoading(true);
    setStatus("");

    try {
      const res = await api.post<LoginResponseOtp>("/auth/login/otp", {
        email,
        otp,
      });

      onLogin({
        token: res.data.token,
        email: res.data.email,
        isMfaRegistered: res.data.isMfaRegistered,
        mfaVerified: res.data.mfaVerified,
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || "OTP login failed.";
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Main App Login</h2>
        <p className="login-subtitle">
          Enter your email and choose to login using password or OTP.
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
        {errors.email && (
          <small className="error-text">{errors.email}</small>
        )}

        {/* Options: Password / OTP */}
        <div
          style={{
            display: "flex",
            gap: 8,
            margin: "10px 0 8px",
          }}
        >
          <Button onClick={handleUsePasswordMode} loading={loading}>
            Login with Password
          </Button>
          <Button onClick={handleUseOtpMode} loading={loading}>
            Login with OTP
          </Button>
        </div>

        {mode === "password" && (
          <>
            <hr className="login-divider" />
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
            <Button onClick={handlePasswordLogin} loading={loading}>
              Login with Password
            </Button>
          </>
        )}

        {mode === "otp" && (
          <>
            <hr className="login-divider" />
            <TextInput
              label="6-digit OTP"
              value={otp}
              onChange={(val) => {
                setOtp(val);
                setErrors((prev) => ({ ...prev, otp: undefined }));
              }}
              maxLength={6}
              placeholder="123456"
            />
            {errors.otp && (
              <small className="error-text">{errors.otp}</small>
            )}
            <Button onClick={handleOtpLogin} loading={loading}>
              Login with OTP
            </Button>
          </>
        )}

        {status && <p className="login-status">{status}</p>}

        <p className="login-footer">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="link-button"
          >
            Go to Register
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
