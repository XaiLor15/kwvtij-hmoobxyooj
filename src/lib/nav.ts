import {
  Award,
  Calendar,
  Crown,
  HandCoins,
  LayoutDashboard,
  Newspaper,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Data is private to signed-in members. */
  private?: boolean;
}

// URLs are unchanged from the original app so bookmarks keep working.
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "ພາບລວມ", items: [{ title: "ໜ້າຫຼັກ", url: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "ຕະກູນ",
    items: [
      { title: "ສະມາຊິກ", url: "/members", icon: Users },
      { title: "ຄະນະນຳ", url: "/leadership", icon: Crown },
      { title: "ຜູ້ອາວຸໂສ", url: "/elders", icon: Award },
    ],
  },
  {
    label: "ກິດຈະກຳ",
    items: [
      { title: "ກິດຈະກຳ", url: "/activities", icon: Calendar },
      { title: "ຂ່າວສານ", url: "/news", icon: Newspaper },
    ],
  },
  {
    label: "ການເງິນ",
    items: [
      { title: "ການເງິນ", url: "/finance", icon: Wallet, private: true },
      { title: "ຜູ້ເຂົ້າຮ່ວມກອງທຶນ", url: "/fund-contributors", icon: HandCoins, private: true },
      { title: "ຕິດຕາມການບໍລິຈາກ", url: "/donation-tracking", icon: TrendingUp, private: true },
    ],
  },
];
