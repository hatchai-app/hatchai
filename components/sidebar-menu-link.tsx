"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SidebarMenuButton } from "@/components/ui/sidebar"; // Adjust the import path based on your file structure // Adjust the import path based on your file structure

const SidebarMenuLink = ({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactElement;
}) => {
  const pathname = usePathname();

  const isActive = pathname === href;

  return (
    <SidebarMenuButton
      asChild
      className={cn(
        "hover:bg-neutral-200/50 dark:hover:bg-zinc-800/60",
        isActive &&
          "bg-neutral-200 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-800"
      )}
    >
      <Link
        href={href}
        className={cn("flex items-center rounded-md transition-colors")}
      >
        {icon}
        <span>{children}</span>
      </Link>
    </SidebarMenuButton>
  );
};

export default SidebarMenuLink;
