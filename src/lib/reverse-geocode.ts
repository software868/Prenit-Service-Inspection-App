import {
  type StoredSubmitLocation,
  googleMapsUrl,
  parseSubmitLocation,
} from "@/lib/geo";

const USER_AGENT = "PrenitServiceInspection/1.0 (service-inspection-reports)";

function formatNominatimAddress(data: {
  display_name?: string;
  address?: Record<string, string>;
}) {
  const address = data.address || {};
  const street = [address.house_number, address.road].filter(Boolean).join(" ");
  const parts = [
    street,
    address.suburb || address.neighbourhood || address.village,
    address.city || address.town || address.municipality || address.county,
    address.state,
    address.postcode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.join(", ") || data.display_name || "";
}

export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    return formatNominatimAddress(data) || null;
  } catch {
    return null;
  }
}

export async function resolveSubmitLocation(raw: unknown): Promise<StoredSubmitLocation | null> {
  const input = parseSubmitLocation(raw);
  if (!input) return null;

  const address =
    (await reverseGeocodeAddress(input.latitude, input.longitude)) ||
    `${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`;
  const capturedAt = input.capturedAt ? new Date(input.capturedAt) : new Date();

  return {
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy ?? null,
    address,
    mapUrl: googleMapsUrl(input.latitude, input.longitude),
    capturedAt: Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt,
  };
}

function osmTileUrl(lat: number, lng: number, zoom: number) {
  const tiles = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * tiles);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * tiles
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

export async function fetchStaticMapImage(lat: number, lng: number): Promise<Buffer | null> {
  const sources = [
    `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=640x280&maptype=mapnik&markers=${lat},${lng},red-pushpin`,
    osmTileUrl(lat, lng, 16),
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "image/png,image/*", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("image") && !contentType.includes("octet-stream")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 800) continue;
      return buffer;
    } catch {
      // try the next map source
    }
  }

  return null;
}
