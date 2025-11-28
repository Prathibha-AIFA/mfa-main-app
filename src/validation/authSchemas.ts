// src/validation/authSchemas.ts
import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const otpSchema = z
  .string()
  .min(6, "OTP must be 6 digits")
  .max(6, "OTP must be 6 digits")
  .regex(/^\d+$/, "OTP must contain only digits");

// For "Check Account" step
export const checkAccountSchema = z.object({
  email: emailSchema,
});

// For password login
export const passwordLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// For OTP login
export const otpLoginSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

// For register page
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export type CheckAccountInput = z.infer<typeof checkAccountSchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type OtpLoginInput = z.infer<typeof otpLoginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
