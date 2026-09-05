import { Layout, Menu } from "antd";
import { Outlet } from "react-router-dom";
import { useUIStore } from "./store/uiStore";

const { Header, Sider, Content } = Layout;

export function RootLayout() {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <Layout className="min-h-screen">
      <Sider collapsible collapsed={isSidebarCollapsed} onCollapse={toggleSidebar}>
        <div className="h-8 m-4 bg-white/20" />
        <Menu theme="dark" mode="inline" items={[{ key: "home", label: "Dashboard" }]} />
      </Sider>
      <Layout>
        <Header className="bg-white px-4 flex items-center">
          <span className="text-lg font-semibold">Admin</span>
        </Header>
        <Content className="p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
