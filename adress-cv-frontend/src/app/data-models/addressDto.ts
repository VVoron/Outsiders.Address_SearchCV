export interface AddressDto {
  id: number;
  uploadDate: Date;
  photoUrl: string;
  address: string;
  coordinates: string;
  status: string;
  lat: number;
  lon: number;
  height: number;
  angle: number;
  username?: string;
  imageId?: number;
  imageFilename?: string;
  trashCount?: number;
  trash_images: {
    id: number;
    filename: string;
    file_path: string;
    preview_url?: string;
    lan?: number;
    lot?: number;
  }[];
}

export interface ApiImageLocation {
  id: number;
  status: string;
  created_at: string;
  user: {
    id: number;
    username: string;
  };
  main_address: string;
  height: number;
  angle: number;
  error_reason?: string | null;
  main_coordinates: {
    lat: number;
    lon: number;
  };
  main_image: {
    id: number;
    filename: string;
    file_path: string;
    preview_url?: string;
  };
  trash_images: {
    id: number;
    filename: string;
    file_path: string;
    preview_url?: string;
  }[];
}


export interface ApiImageLocationsResponse {
  meta: {
    per_page: number;
    current_page: number;
    last_page: number;
    total: number;
    from: number;
  };
  data: ApiImageLocation[];
}


export interface ImageDTO {
  id: number;
  filename: string;
  file_path: string;
  preview_url: string;
}

export interface UploadImageItem {
  image: File;
  addres?: string | null;
  angle?: number | null;
  height?: number | null;
  lat?: number | null;
  lon?: number | null;
}