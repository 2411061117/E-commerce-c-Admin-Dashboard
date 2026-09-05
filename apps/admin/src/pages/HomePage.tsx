import { Typography } from "antd";

const { Title, Paragraph } = Typography;

export function HomePage() {
  return (
    <div>
      <Title level={2}>Admin App</Title>
      <Paragraph>Project foundation is set up. Business features land in later phases.</Paragraph>
    </div>
  );
}
