import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@ecommerce/shared";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { PasswordField } from "../app/PasswordField";
import { mapAuthError } from "../modules/auth/errors";
import { useSignUp } from "../modules/auth/hooks";

export function RegisterPage() {
  const signUpMutation = useSignUp();
  const [emailConfirmationPending, setEmailConfirmationPending] =
    useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    signUpMutation.mutate(values, {
      onSuccess: (data) => {
        if (!data.session) {
          setEmailConfirmationPending(true);
        }
      },
    });
  });

  if (emailConfirmationPending) {
    return (
      <>
        <h1>Kiểm tra email để xác nhận tài khoản</h1>
        <p className="auth-subcopy">
          Chúng tôi đã gửi một email xác nhận. Vui lòng xác nhận rồi quay lại
          đăng nhập.
        </p>
        <p className="auth-signup-line">
          <Link to="/login" className="auth-link">
            Về trang đăng nhập
          </Link>
        </p>
      </>
    );
  }

  if (signUpMutation.isSuccess && signUpMutation.data.session) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <h1>Đăng ký</h1>
      <p className="auth-subcopy">Tạo tài khoản để bắt đầu mua sắm.</p>

      {signUpMutation.isError && (
        <div className="auth-form-alert">
          {mapAuthError(signUpMutation.error)}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Controller
          name="fullName"
          control={control}
          render={({ field }) => (
            <div
              className={`auth-field${errors.fullName ? " has-error" : ""}`}
            >
              <label htmlFor="fullName">Họ tên</label>
              <input
                {...field}
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />
              {errors.fullName && (
                <p className="auth-field-error">{errors.fullName.message}</p>
              )}
            </div>
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <div className={`auth-field${errors.email ? " has-error" : ""}`}>
              <label htmlFor="email">Email</label>
              <input
                {...field}
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="auth-field-error">{errors.email.message}</p>
              )}
            </div>
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <div
              className={`auth-field${errors.password ? " has-error" : ""}`}
            >
              <label htmlFor="password">Mật khẩu</label>
              <PasswordField
                id="password"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="auth-field-error">{errors.password.message}</p>
              )}
            </div>
          )}
        />
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <div
              className={`auth-field${errors.confirmPassword ? " has-error" : ""}`}
            >
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <PasswordField
                id="confirmPassword"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="auth-field-error">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          )}
        />
        <button
          type="submit"
          className="auth-submit-btn"
          disabled={signUpMutation.isPending}
        >
          Đăng ký
        </button>
      </form>
      <p className="auth-signup-line">
        Đã có tài khoản?{" "}
        <Link to="/login" className="auth-link">
          Đăng nhập
        </Link>
      </p>
    </>
  );
}
