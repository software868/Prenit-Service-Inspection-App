export type SubmitLocationInput = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  capturedAt?: string | null;
};

export type StoredSubmitLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string;
  mapUrl: string;
  capturedAt: Date;
};

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function parseSubmitLocation(value: unknown): SubmitLocationInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const latitude = typeof raw.latitude === "number" ? raw.latitude : Number(raw.latitude);
  const longitude = typeof raw.longitude === "number" ? raw.longitude : Number(raw.longitude);
  if (!isValidLatLng(latitude, longitude)) return null;

  const accuracy =
    typeof raw.accuracy === "number" && Number.isFinite(raw.accuracy) ? raw.accuracy : null;
  const capturedAt = typeof raw.capturedAt === "string" ? raw.capturedAt : null;

  return { latitude, longitude, accuracy, capturedAt };
}

export function formatCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function openStreetMapUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

export function osmEmbedUrl(lat: number, lng: number) {
  const padLng = 0.01;
  const padLat = 0.006;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - padLng},${lat - padLat},${lng + padLng},${lat + padLat}&layer=mapnik&marker=${lat},${lng}`;
}

export function staticMapUrl(lat: number, lng: number, width = 640, height = 280) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=${width}x${height}&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
}

export function formatAccuracy(meters?: number | null) {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `±${Math.round(meters)} m`;
  return `±${(meters / 1000).toFixed(1)} km`;
}
