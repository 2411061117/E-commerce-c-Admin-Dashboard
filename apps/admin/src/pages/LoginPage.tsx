import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@ecommerce/shared";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthProvider";
import { mapAuthError } from "../modules/auth/errors";
import { useSignIn } from "../modules/auth/hooks";

const { Title } = Typography;

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
    <div className="flex justify-center pt-12">
      <Card className="w-full max-w-sm">
        <Title level={3}>Đăng nhập Admin</Title>
        {signInMutation.isError && (
          <Alert
            className="mb-4"
            type="error"
            showIcon
            message={mapAuthError(signInMutation.error)}
          />
        )}
        <Form layout="vertical" onFinish={onSubmit}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Email"
                validateStatus={errors.email ? "error" : ""}
                help={errors.email?.message}
              >
                <Input {...field} autoComplete="email" />
              </Form.Item>
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Mật khẩu"
                validateStatus={errors.password ? "error" : ""}
                help={errors.password?.message}
              >
                <Input.Password {...field} autoComplete="current-password" />
              </Form.Item>
            )}
          />
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={signInMutation.isPending}
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
