interface PhotoMeta {
  address: string;
  lat: string;
  lon: string;
  height: string;
  angle: string;
}

interface PhotoItem {
  file: File;
  url: string;
  meta: PhotoMeta;
  hover: boolean;
}