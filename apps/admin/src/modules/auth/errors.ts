export function mapAuthError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("Invalid login credentials")) {
      return "Email hoặc mật khẩu không đúng.";
    }
    if (message.includes("Email not confirmed")) {
      return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
    }
    return message;
  }
  return "Đã có lỗi không xác định xảy ra.";
}
