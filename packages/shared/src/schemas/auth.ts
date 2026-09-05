import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email")
  .email("Email không hợp lệ");

export const passwordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, "Vui lòng nhập họ tên"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
