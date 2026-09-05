import { Result } from "antd";

export function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Result
        status="error"
        title="Ứng dụng chưa được cấu hình"
        subTitle={message}
      />
    </div>
  );
}
