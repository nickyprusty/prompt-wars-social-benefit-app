import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNearbyHospitals } from '../app/actions/hospitals';

describe('Hospitals: getNearbyHospitals', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, GOOGLE_MAPS_API_KEY: 'test-api-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should normalize and slice top 3 results', async () => {
    const mockHospitals = {
      status: "OK",
      results: [
        { name: "Hospital 1", vicinity: "Street 1", place_id: "p1", rating: 4.5 },
        { name: "Hospital 2", vicinity: "Street 2", place_id: "p2", rating: 4.0 },
        { name: "Hospital 3", vicinity: "Street 3", place_id: "p3", rating: 3.5 },
        { name: "Hospital 4", vicinity: "Street 4", place_id: "p4", rating: 3.0 },
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHospitals)
    });

    const result = await getNearbyHospitals(37.7749, -122.4194);
    
    expect(result.hospitals).toHaveLength(3);
    expect(result.hospitals[0].name).toBe("Hospital 1");
    expect(result.hospitals[0].maps_link).toContain("p1");
  });

  it('should return empty list on ZERO_RESULTS', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ZERO_RESULTS", results: [] })
    });

    const result = await getNearbyHospitals(37.7749, -122.4194);
    expect(result.hospitals).toHaveLength(0);
  });

  it('should handle API errors by returning a safe error object', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "REQUEST_DENIED", error_message: "API Key Invalid" })
    });

    const result = await getNearbyHospitals(37.7749, -122.4194);
    expect(result.error).toContain("Failed to fetch nearby hospitals");
  });
});
