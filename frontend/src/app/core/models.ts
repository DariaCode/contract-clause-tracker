/**
 * API contract types — mirror the FastAPI Pydantic schemas (backend/app/schemas.py).
 *
 * Field names intentionally match the API's snake_case so no mapping layer is
 * needed between HTTP and the app.
 *
 * Domain: a Document is split into Sentences; an Annotation links a Sentence to
 * a Label (the catalog entry, e.g. "Non-Compete").
 */

export interface Label {
  id: number;
  name: string;
  color: string;
  hotkey: string | null;
  is_custom: boolean;
}

/** A label plus how many documents reference it (the management page). */
export interface LabelUsage extends Label {
  documents_count: number;
}

/** A label plus how many sentences in a document carry it. */
export interface LabelCount {
  id: number;
  name: string;
  color: string;
  count: number;
}

export interface Annotation {
  id: number;
  sentence_id: number;
  label: Label;
  created_at: string;
}

export interface Sentence {
  id: number;
  position: number;
  text: string;
  start_char: number;
  end_char: number;
  annotations: Annotation[];
}

/** Lightweight document row for the dashboard list. */
export interface DocumentSummary {
  id: number;
  title: string;
  filename: string;
  content_type: 'text' | 'markdown';
  created_at: string;
  sentence_count: number;
  annotation_count: number;
  labels: LabelCount[];
}

/** Full document with sentences + annotations — the editor view. */
export interface DocumentDetail {
  id: number;
  title: string;
  filename: string;
  content_type: 'text' | 'markdown';
  content: string;
  created_at: string;
  sentences: Sentence[];
}

export interface DocumentGroup {
  label: LabelCount | null; // null => the "Unlabeled" bucket
  documents: DocumentSummary[];
}

/** Flat list, or grouped buckets when `group_by=label`. */
export interface DocumentListResponse {
  documents?: DocumentSummary[];
  groups?: DocumentGroup[];
}

export interface LabelCreate {
  name: string;
  color?: string;
  hotkey?: string | null;
}

export interface LabelUpdate {
  name?: string;
  color?: string;
  hotkey?: string | null;
}

export interface AnnotationCreate {
  sentence_id: number;
  label_id: number;
}

/** Query params accepted by the dashboard list endpoint. */
export interface DocumentListQuery {
  search?: string;
  label_id?: number;
  group_by?: 'label';
}
