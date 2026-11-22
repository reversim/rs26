// Where the summit happens. Single source of truth for the venue section, the
// structured data in Layout.astro and the markdown twins agents read.

export const venue = {
  name: "Expo Tel Aviv · Pavilion 10",
  // Schema.org wants the place and the hall separately; the display name above
  // glues them together for humans.
  place: "Expo Tel Aviv",
  hall: "Pavilion 10",
  street: "Rokach Blvd 101",
  city: "Tel Aviv-Yafo",
  country: "IL",
  lat: 32.106411,
  lng: 34.810085,
} as const;

export const wazeHref = `https://waze.com/ul?ll=${venue.lat},${venue.lng}&navigate=yes`;
export const googleMapsHref = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;
