// Domain models used by the UI. Stores map database rows (snake_case) into
// these shapes; pages and business logic only ever see these types.

export type Gender = "M" | "F";
export type MemberStatus = "alive" | "deceased";
export type MemberCategory = "ສະມາຊິກ" | "ຄະນະນຳ" | "ຜູ້ອາວຸໂສ";

export interface Member {
  id: number;
  name: string;
  nickname: string;
  gender: Gender;
  /** Stored age (legacy). Prefer `ageFromBirthdate(birthdate)` for display. */
  age: number;
  gen: number;
  role: string;
  branch: string;
  village: string;
  district: string;
  province: string;
  address: string;
  status: MemberStatus;
  /** Contact data — only readable by signed-in users (empty for guests). */
  phone: string;
  photo: string | null;
  parent?: number;
  note?: string;
  birthdate?: string;
  category?: string;
  position?: string;
  /** Derived from member_relations. */
  children: number[];
  spouse: number[];
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
  eventTitle: string;
  category?: string;
  memberId?: number;
  /** Free-form type label chosen in the form ("ຄ່າທຳນຽມ", "ບໍລິຈາກ", "ສຸກເສີນ", "ລາຍຈ່າຍ"). */
  type: string;
  contributor: string;
  method: string;
  note: string;
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
  contributions: number;
  expectedPerMember: number;
  tags: string[];
  cover: string;
  colorA: string;
  colorB: string;
}

export type FundStatus = "active" | "inactive";

export interface FundMember {
  id: string;
  memberId: number;
  joinedAt: string;
  status: FundStatus | string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export type LeaderStatus = "active" | "advisor" | "former";

export interface Leader {
  id: number;
  memberId?: number;
  name: string;
  position: string;
  department: string;
  branch: string;
  phone: string;
  photo: string | null;
  bio: string;
  displayOrder: number;
  active: boolean;
  status: LeaderStatus;
  startYear?: number;
  endYear?: number;
  achievements: string[];
  updatedAt: string | null;
}

export type ElderStatus = "living" | "advisor" | "deceased";

export interface Elder {
  id: number;
  memberId?: number;
  name: string;
  age?: number;
  branch: string;
  phone: string;
  photo: string | null;
  note: string;
  position: string;
  bio: string;
  department: string;
  displayOrder: number;
  active: boolean;
  status: ElderStatus;
  contributions: string;
  honors: string;
  updatedAt: string | null;
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
  /** false = draft (only visible to signed-in members). */
  published: boolean;
  image: string | null;
}

export interface GalleryImage {
  id: number;
  eventId: number;
  url: string;
  name: string;
}
