export enum Role {
  USER = 'user',
  MODEL = 'model',
  ERROR = 'error'
}

export interface Media {
  url: string; // Object URL for preview
  type: string; // MIME type
  name: string; // File name
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  role: Role;
  parts: string;
  media?: Media;
  sources?: GroundingSource[];
}
