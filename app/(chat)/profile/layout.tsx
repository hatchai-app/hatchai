import { UserProfileHeader } from "./header";

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-dvh">
      <UserProfileHeader />
      <div className="w-full flex justify-center mt-16">
        <main className="md:max-w-3xl w-full px-4 h-dvh">{children}</main>
      </div>
    </div>
  );
}
