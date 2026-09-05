import { Outlet } from "react-router-dom";
import "./auth.css";

export function AuthLayout() {
  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <span className="auth-wordmark">Admin</span>
          <div className="auth-rule" />
          <p className="auth-tagline">
            Quản trị hệ thống, vận hành mượt mà.
          </p>
          <ul className="auth-value-props">
            <li>Quản lý đơn hàng và sản phẩm tập trung</li>
            <li>Theo dõi tồn kho theo thời gian thực</li>
            <li>Phân quyền truy cập rõ ràng, an toàn</li>
          </ul>
        </div>
        <p className="auth-brand-footer">
          E-commerce Practice © {new Date().getFullYear()}
        </p>
        <svg
          className="auth-bag-decoration"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M28 34H72L69 88H31L28 34Z" stroke="white" strokeWidth="2" />
          <path
            d="M38 34V26C38 18.268 43.373 12 50 12C56.627 12 62 18.268 62 26V34"
            stroke="white"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
