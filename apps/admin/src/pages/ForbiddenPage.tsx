import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthProvider";
import { useSignOut } from "../modules/auth/hooks";

export function ForbiddenPage() {
  const { user } = useAuth();
  const signOutMutation = useSignOut();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOutMutation.mutate(undefined, {
      onSuccess: () => navigate("/login", { replace: true }),
    });
  };

  return (
    <Result
      status="403"
      title="Không có quyền truy cập"
      subTitle={`Tài khoản ${user?.email ?? ""} không có quyền admin.`}
      extra={
        <Button
          type="primary"
          loading={signOutMutation.isPending}
          onClick={handleLogout}
        >
          Đăng xuất
        </Button>
      }
    />
  );
}
