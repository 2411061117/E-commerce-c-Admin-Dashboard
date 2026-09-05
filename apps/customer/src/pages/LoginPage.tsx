import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@ecommerce/shared";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { PasswordField } from "../app/PasswordField";
import { mapAuthError } from "../modules/auth/errors";
import { useAuth } from "../modules/auth/AuthProvider";
import { useSignIn } from "../modules/auth/hooks";

interface LoginLocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { session, isInitializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const signInMutation = useSignIn();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const redirectTo =
    (location.state as LoginLocationState | null)?.from?.pathname ?? "/";

  if (!isInitializing && session) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = handleSubmit((values) => {
    signInMutation.mutate(values, {
      onSuccess: () => {
        navigate(redirectTo, { replace: true });
      },
    });
  });

  return (
    <>
      <h1>Đăng nhập</h1>
      <p className="auth-subcopy">
        Nhập thông tin tài khoản để tiếp tục mua sắm.
      </p>

      {signInMutation.isError && (
        <div className="auth-form-alert">
          {mapAuthError(signInMutation.error)}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
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
              <div className="auth-field-row">
                <label htmlFor="password">Mật khẩu</label>
                <button type="button" className="auth-link-quiet">
                  Quên mật khẩu?
                </button>
              </div>
              <PasswordField
                id="password"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="auth-field-error">{errors.password.message}</p>
              )}
            </div>
          )}
        />
        <button
          type="submit"
          className="auth-submit-btn"
          disabled={signInMutation.isPending}
        >
          Đăng nhập
        </button>
      </form>
      <p className="auth-signup-line">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="auth-link">
          Đăng ký
        </Link>
      </p>
    </>
  );
}
