"use server";

/**
 * Server action to fetch top 3 nearby hospitals using Google Maps Places API.
 * Uses user's latitude and longitude to find the nearest medical facilities.
 */
export async function getNearbyHospitals(lat: number, lng: number) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn("GOOGLE_MAPS_API_KEY is not configured.");
    return { error: "Google Maps API key missing. Please configure it to see nearby hospitals.", hospitals: [] };
  }

  try {
    // Search for hospitals within a 5km radius
    const radius = 5000; 
    const type = "hospital";
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Maps API Error:", data.status, data.error_message);
      return { error: "Failed to fetch nearby hospitals.", hospitals: [] };
    }

    // Map top 3 results to a simpler structure
    const topHospitals = (data.results || []).slice(0, 3).map((place: any) => ({
      name: place.name,
      address: place.vicinity,
      place_id: place.place_id,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      // Create a direct Google Maps search link for the specific place
      maps_link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + place.vicinity)}&query_place_id=${place.place_id}`
    }));

    return { hospitals: topHospitals };
  } catch (error) {
    console.error("Hospital lookup error:", error);
    return { error: "An unexpected error occurred during hospital lookup.", hospitals: [] };
  }
}
