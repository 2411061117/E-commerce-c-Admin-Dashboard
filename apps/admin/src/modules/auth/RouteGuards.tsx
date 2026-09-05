import { Result } from "antd";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FullPageSpinner } from "../../app/FullPageSpinner";
import { ForbiddenPage } from "../../pages/ForbiddenPage";
import { useAuth } from "./AuthProvider";
import { useProfile } from "./hooks";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isInitializing } = useAuth();
  const location = useLocation();
  const profileQuery = useProfile();

  if (isInitializing || (session && profileQuery.isPending)) {
    return <FullPageSpinner />;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profileQuery.isError) {
    return (
      <Result
        status="error"
        title="Không thể tải hồ sơ"
        subTitle={profileQuery.error.message}
      />
    );
  }

  if (profileQuery.data?.role !== "admin") {
    return <ForbiddenPage />;
  }

  return children;
}
