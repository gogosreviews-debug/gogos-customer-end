import { apiFetch, apiPost } from './api';

export type WaiterNameIdOption = {
  _id: string;
  fullName: string;
};

export type ReviewPayload = {
  name: string;
  email: string;
  phone: string;
  overallExperience: number;
  likedMost: string[];
  ratings: {
    foodQuality: number;
    service: number;
    ambiance: number;
    environment: number;
  };
  waiterDetails: Array<{
    servedBy: string;
    rateWaiter: number;
  }>;
  whatWentWrong: string[] | null;
  whatWentWrongDetails: string | null;
  whatDidYouLove: string[] | null;
  additionalComments: string | null;
};

export async function fetchWaiterNameIdList(): Promise<WaiterNameIdOption[]> {
  return apiFetch<WaiterNameIdOption[]>('waiters/name-id-list');
}

export async function submitReview(payload: ReviewPayload): Promise<void> {
  await apiPost<ReviewPayload>('reviews', payload);
}