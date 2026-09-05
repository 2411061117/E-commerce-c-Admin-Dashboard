import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@ecommerce/shared";
import { Alert, Button, Card, Form, Input, Result, Typography } from "antd";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { mapAuthError } from "../modules/auth/errors";
import { useSignUp } from "../modules/auth/hooks";

const { Title } = Typography;

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
      <div className="flex justify-center pt-12">
        <Result
          status="success"
          title="Kiểm tra email để xác nhận tài khoản"
          subTitle="Chúng tôi đã gửi một email xác nhận. Vui lòng xác nhận rồi quay lại đăng nhập."
          extra={<Link to="/login">Về trang đăng nhập</Link>}
        />
      </div>
    );
  }

  if (signUpMutation.isSuccess && signUpMutation.data.session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex justify-center pt-12">
      <Card className="w-full max-w-sm">
        <Title level={3}>Đăng ký</Title>
        {signUpMutation.isError && (
          <Alert
            className="mb-4"
            type="error"
            showIcon
            message={mapAuthError(signUpMutation.error)}
          />
        )}
        <Form layout="vertical" onFinish={onSubmit}>
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Họ tên"
                validateStatus={errors.fullName ? "error" : ""}
                help={errors.fullName?.message}
              >
                <Input {...field} autoComplete="name" />
              </Form.Item>
            )}
          />
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
                <Input.Password {...field} autoComplete="new-password" />
              </Form.Item>
            )}
          />
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <Form.Item
                label="Xác nhận mật khẩu"
                validateStatus={errors.confirmPassword ? "error" : ""}
                help={errors.confirmPassword?.message}
              >
                <Input.Password {...field} autoComplete="new-password" />
              </Form.Item>
            )}
          />
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={signUpMutation.isPending}
          >
            Đăng ký
          </Button>
        </Form>
        <div className="mt-4 text-center">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </div>
      </Card>
    </div>
  );
}
