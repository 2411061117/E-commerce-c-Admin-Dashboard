import { Spin } from "antd";

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spin size="large" />
    </div>
  );
}
