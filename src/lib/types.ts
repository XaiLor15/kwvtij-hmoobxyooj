// Shared TypeScript types for clan data.

export type Gender = "M" | "F";
export type MemberStatus = "alive" | "deceased";

export interface Member {
  id: number;
  name: string;
  nickname: string;
  gender: Gender;
  age: number;
  gen: number;
  role: string;
  branch: string;
  village: string;
  district: string;
  province: string;
  address: string;
  status: MemberStatus;
  phone: string;
  photo: string | null;
  children: number[];
  spouse: number[];
  parent?: number;
  note?: string;
  birthdate?: string;
  category?: string;
  position?: string;
}

export type TxDirection = "income" | "expense";

export interface Transaction {
  id: string;
  createdAt: number;
  date: string;
  direction: TxDirection;
  amount: number;
  description: string;
  eventId?: number;
  category?: string;
  memberId?: number;
}

export interface ClanEvent {
  id: number;
  title: string;
  category: string;
  status: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  attendees: number;
  budget: number;
  spent: number;
  tags: string[];
  cover: string;
  colorA: string;
  colorB: string;
}

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  date: string;
  tags: string[];
  views: number;
  comments: number;
  pinned: boolean;
  featured: boolean;
  urgent: boolean;
  image: string | null;
}
