import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const PASSWORD_MIN = 8;
/** bcrypt only uses the first 72 bytes of a password, so reject anything longer. */
const PASSWORD_MAX_BYTES = 72;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
  .regex(
    /^[a-z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores"
  );

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .refine(
    (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
    "Password is too long"
  );

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

// Login only checks presence: password rules must not leak through error messages.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const usernameCheckQuerySchema = z.object({ username: usernameSchema });

/** Client-only: adds a confirmation field that never leaves the browser. */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, "Confirm your password") })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterFormValues = z.input<typeof registerFormSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
