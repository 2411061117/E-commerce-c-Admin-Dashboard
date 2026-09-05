import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@ecommerce/shared";
import { Controller, useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { PasswordField } from "../app/PasswordField";
import { useAuth } from "../modules/auth/AuthProvider";
import { mapAuthError } from "../modules/auth/errors";
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
    // Role check (customer vs admin) happens at the destination via RequireAdmin.
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
      <h1>Đăng nhập Admin</h1>
      <p className="auth-subcopy">
        Đăng nhập để truy cập bảng điều khiển quản trị.
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
              <label htmlFor="password">Mật khẩu</label>
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
    </>
  );
}
