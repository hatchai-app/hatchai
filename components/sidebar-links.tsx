import { MessageCircleMore, User2 } from "lucide-react";
import SidebarMenuLink from "./sidebar-menu-link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel
} from "./ui/sidebar";

export function SidebarLinks() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Get started</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenuLink href="/" icon={<MessageCircleMore />}>
          Home
        </SidebarMenuLink>
        <SidebarMenuLink href="/profile" icon={<User2 />}>
          Profile
        </SidebarMenuLink>
        {/* <SidebarMenuLink href="/pitch" icon={<Presentation />}>
          Pitch
        </SidebarMenuLink> */}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
