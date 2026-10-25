import type { OnboardingStatus, Proficiency, UserRole } from './CommonEnum';

/* Shared entities used by pages and by reusable components in src/component. */

/* ── Catalogue ──────────────────────────── */

export interface Category {
  id: string;
  name: string;
  /** Icon key, resolved to a lucide icon in CategoryGrid */
  icon: string;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  fromPrice: number;
  rating: number;
  reviews: number;
  durationMins: number;
}

/* ── Marketing / landing ────────────────── */

export interface PlatformStat {
  label: string;
  value: string;
}

export interface EarningRate {
  skillId: string;
  skillName: string;
  /** Average provider earning per working hour, in ₹ */
  hourlyAvg: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: UserRole;
  text: string;
  rating: number;
  /** e.g. "AC repair · Koramangala" or "Electrician · 2 yrs on Helpio" */
  meta: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

/* ── Auth ───────────────────────────────── */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  /** E.164, e.g. +919876543210 */
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  /** Providers only; null for customers */
  onboardingStatus: OnboardingStatus | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/* ── Provider onboarding ────────────────── */

export interface SkillOption {
  id: string;
  name: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  skills: SkillOption[];
}

export interface ProviderSkill {
  skillId: string;
  proficiency: Proficiency;
  yearsExperience: number | null;
}

/** One working day: `day` 0 = Monday … 6 = Sunday, times as "HH:MM" (24h) */
export interface AvailabilitySlot {
  day: number;
  start: string;
  end: string;
}

export interface ServiceArea {
  latitude: number | null;
  longitude: number | null;
  pincode: string;
  areaName: string;
  /** Travel radius in metres */
  radiusM: number;
}

export interface ProviderOnboarding {
  status: OnboardingStatus;
  skills: ProviderSkill[];
  availability: AvailabilitySlot[];
  serviceArea: ServiceArea | null;
}
