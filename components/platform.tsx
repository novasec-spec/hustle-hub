import { IoLogoYoutube, IoLogoTiktok, IoLogoInstagram } from "react-icons/io5";
import type { Content } from "@/lib/types";

export const PLATFORMS: Record<Content["platform"], { label: string; icon: typeof IoLogoYoutube; cls: string }> = {
  youtube: { label: "YouTube", icon: IoLogoYoutube, cls: "text-[#ff4e45] bg-[#ff4e45]/12" },
  tiktok: { label: "TikTok", icon: IoLogoTiktok, cls: "text-[#25f4ee] bg-[#25f4ee]/10" },
  instagram: { label: "Instagram", icon: IoLogoInstagram, cls: "text-[#e1306c] bg-[#e1306c]/12" },
};

export function PlatformIcon({ p, size = 14 }: { p: Content["platform"]; size?: number }) {
  const { icon: Icon, cls } = PLATFORMS[p];
  return <span className={`inline-flex rounded-md p-1 ${cls}`}><Icon size={size} /></span>;
}
