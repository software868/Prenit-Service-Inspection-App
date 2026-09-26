export const OT_EQUIPMENT_CHECKLIST = [
  "Pendant",
  "X-Ray Viewer",
  "Scrub Sink",
  "OT Light Camera",
  "Surgeon Control Panel",
  "Medical Recorder",
  "Wall Panel & Ceiling Panel",
  "OT Table",
  "Sliding Door / Hermetically Sealed OT Door",
  "TUV / Theatre Vacuum Unit",
  "Storage Unit",
  "Hatch Box",
  "PACS Monitor",
  "PRD",
  "HEPA Filter",
  "DB Box",
  "Medical Gas Alarm",
  "View Window",
] as const;

export type ChecklistStatusValue = "OK" | "NOT_OK" | "NA";

export interface SelectionPath {
  siteId?: string;
  siteName?: string;
  siteSlug?: string;
  departmentId?: string;
  departmentName?: string;
  departmentSlug?: string;
  sectionId?: string;
  sectionName?: string;
  sectionSlug?: string;
  locationId?: string;
  locationName?: string;
  locationSlug?: string;
  equipmentId?: string;
  equipmentName?: string;
  checklistItemId?: string;
  checklistItemName?: string;
  parentChecklistItemId?: string;
  parentChecklistItemName?: string;
}

export interface ChecklistItemResponse {
  checklistItemId: string;
  name: string;
  status: ChecklistStatusValue | null;
  remarks: string;
  photoData?: string;
  audioData?: string;
  photoFileName?: string;
  audioFileName?: string;
}

export interface SubmitLocationInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  capturedAt?: string | null;
}

export interface DraftReport {
  id?: string;
  reportNumber?: string;
  path: SelectionPath;
  breadcrumb: string;
  engineerName: string;
  responses: ChecklistItemResponse[];
  status: "DRAFT" | "SUBMITTED";
  submitLocation?: SubmitLocationInput | null;
  updatedAt?: string;
}

export const VOICE_LANGUAGES = [
  { id: "en", code: "en-IN", label: "English" },
  { id: "hi", code: "hi-IN", label: "Hindi" },
  { id: "hinglish", code: "en-IN", label: "Hinglish" },
] as const;

export const STATUS_OPTIONS: { value: ChecklistStatusValue; label: string; color: string }[] = [
  { value: "OK", label: "OK", color: "bg-emerald-500" },
  { value: "NOT_OK", label: "Not OK", color: "bg-orange-500" },
];
