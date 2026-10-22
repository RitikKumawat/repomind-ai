import { Center, Container } from "@mantine/core";
import { GuestGuard } from "@/components/layout/GuestGuard";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <GuestGuard>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--mantine-color-gray-0)",
        }}
      >
        <Center style={{ minHeight: "100vh" }}>
          <Container size="xs" style={{ width: "100%" }}>
            {children}
          </Container>
        </Center>
      </div>
    </GuestGuard>
  );
}
