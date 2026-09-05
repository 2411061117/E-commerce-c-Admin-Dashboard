import { Button, Result } from "antd";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Unhandled UI error:", error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <Result
          status="error"
          title="Đã có lỗi xảy ra"
          subTitle={this.state.error.message}
          extra={
            <Button type="primary" onClick={this.handleReset}>
              Tải lại trang
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
