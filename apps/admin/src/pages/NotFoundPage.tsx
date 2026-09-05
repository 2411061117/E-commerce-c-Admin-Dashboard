import { Button, Result } from "antd";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="Trang bạn tìm không tồn tại."
      extra={
        <Button type="primary">
          <Link to="/">Về Dashboard</Link>
        </Button>
      }
    />
  );
}
