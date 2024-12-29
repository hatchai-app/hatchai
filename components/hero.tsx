"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Hero() {
  const pathname = usePathname();
  const isActive = pathname === "/";
  return (
    <div
      className={cn(
        "absolute w-full h-full flex flex-col justify-center items-center pointer-events-none z-20 text-6xl",
        !isActive && "hidden"
      )}
    >
      <div className="mt-[-52px]">🐣</div>
      <div className="text-xl text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-8">
        Claims, simplified. To start, create a{" "}
        <Link
          href="/profile"
          className="text-xl bg-zinc-200 hover:bg-zinc-300 hover:text-zinc-600 duration-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 py-1 px-1.5 rounded-lg pointer-events-auto items-center gap-0.5 w-fit flex"
        >
          profile <ArrowUpRight className="inline-block" />
        </Link>
      </div>
    </div>
  );
}
