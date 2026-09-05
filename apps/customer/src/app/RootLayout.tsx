import { Button, Layout } from "antd";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthProvider";
import { useSignOut } from "../modules/auth/hooks";

const { Header, Content, Footer } = Layout;

export function RootLayout() {
  const { session } = useAuth();
  const signOutMutation = useSignOut();

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold text-white">
          Shop
        </Link>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link className="text-white" to="/account">
                Tài khoản
              </Link>
              <Button
                size="small"
                loading={signOutMutation.isPending}
                onClick={() => signOutMutation.mutate()}
              >
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Link className="text-white" to="/login">
                Đăng nhập
              </Link>
              <Link className="text-white" to="/register">
                Đăng ký
              </Link>
            </>
          )}
        </div>
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
