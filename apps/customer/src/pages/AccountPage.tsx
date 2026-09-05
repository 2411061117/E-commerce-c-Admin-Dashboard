import { Button, Card, Descriptions, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthProvider";
import { useProfile, useSignOut } from "../modules/auth/hooks";

const { Title } = Typography;

export function AccountPage() {
  const { user } = useAuth();
  const profileQuery = useProfile();
  const signOutMutation = useSignOut();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOutMutation.mutate(undefined, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  };

  return (
    <Card loading={profileQuery.isPending}>
      <Title level={3}>Tài khoản của tôi</Title>
      {profileQuery.isError && (
        <p>Không thể tải thông tin hồ sơ: {profileQuery.error.message}</p>
      )}
      {profileQuery.data && (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Họ tên">
            {profileQuery.data.full_name}
          </Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">
            {profileQuery.data.phone ?? "Chưa cập nhật"}
          </Descriptions.Item>
        </Descriptions>
      )}
      <Button
        className="mt-4"
        danger
        loading={signOutMutation.isPending}
        onClick={handleLogout}
      >
        Đăng xuất
      </Button>
    </Card>
  );
}
