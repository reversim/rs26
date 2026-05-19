export interface TalkSpeaker {
  id: string;
  name: string;
}

export interface CategoryItem {
  id: string;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  categoryItems: CategoryItem[];
  sort: number;
}

export interface Talk {
  questionAnswers: [];
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  isServiceSession: boolean;
  isPlenumSession: boolean;
  speakers: TalkSpeaker[];
  categories: Category[];
  roomId: number;
  room: string;
  liveUrl: any;
  recordingUrl: any;
  status: any;
  isInformed: boolean;
  isConfirmed: boolean;
}

export interface SessionGroup {
  groupId: number;
  groupName: string;
  sessions: Talk[];
}
