import { Button, Layout, Menu, Typography } from "antd";
import { Outlet, useNavigate } from "react-router-dom";
import { useProfile, useSignOut } from "../modules/auth/hooks";
import { useUIStore } from "./store/uiStore";

const { Header, Sider, Content } = Layout;

export function RootLayout() {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const profileQuery = useProfile();
  const signOutMutation = useSignOut();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOutMutation.mutate(undefined, {
      onSuccess: () => navigate("/login", { replace: true }),
    });
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={isSidebarCollapsed}
        onCollapse={toggleSidebar}
      >
        <div className="h-8 m-4 bg-white/20" />
        <Menu
          theme="dark"
          mode="inline"
          items={[{ key: "home", label: "Dashboard" }]}
        />
      </Sider>
      <Layout>
        <Header className="flex items-center justify-between bg-white px-4">
          <span className="text-lg font-semibold">Admin</span>
          <div className="flex items-center gap-3">
            {profileQuery.data && (
              <Typography.Text>{profileQuery.data.full_name}</Typography.Text>
            )}
            <Button loading={signOutMutation.isPending} onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        </Header>
        <Content className="p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
