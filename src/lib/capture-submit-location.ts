"use client";

import type { SubmitLocationInput } from "@/lib/geo";

export async function captureSubmitLocation(
  timeoutMs = 8000
): Promise<SubmitLocationInput | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      });
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function withSubmitLocation<T extends object>(payload: T) {
  const submitLocation = await captureSubmitLocation();
  return { ...payload, submitLocation };
}
