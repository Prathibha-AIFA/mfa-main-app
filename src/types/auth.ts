// src/types/auth.ts

export interface AuthState {
  token: string;
  email: string;
  isMfaRegistered: boolean;
  mfaVerified: boolean;
}

export interface LoginResponsePassword {
  token: string;
  email: string;
  isMfaRegistered: boolean;
}

export interface LoginResponseOtp {
  token: string;
  email: string;
  isMfaRegistered: boolean;
  mfaVerified: boolean;
}

export interface MfaStatusResponse {
  exists: boolean;
  isMfaRegistered?: boolean;
}
