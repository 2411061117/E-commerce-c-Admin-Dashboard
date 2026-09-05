import { Layout } from "antd";
import { Outlet } from "react-router-dom";

const { Header, Content, Footer } = Layout;

export function RootLayout() {
  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center">
        <span className="text-lg font-semibold text-white">Shop</span>
      </Header>
      <Content className="p-6">
        <Outlet />
      </Content>
      <Footer className="text-center">
        E-commerce Practice © {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}
