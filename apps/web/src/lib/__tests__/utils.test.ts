import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateBearing,
  calculateSpeed,
  pointInPolygon,
  formatCoordinates,
  generateTouristToken,
  parseTouristToken
} from '../utils';

describe('Utils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = calculateDistance(0, 0, 0, 1);
      expect(distance).toBeGreaterThan(0);
    });

    it('should return 0 for same points', () => {
      const distance = calculateDistance(52.5200, 13.4050, 52.5200, 13.4050);
      expect(distance).toBe(0);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing between points', () => {
      const bearing = calculateBearing(0, 0, 0, 1);
      expect(bearing).toBe(90);
    });

    it('should handle negative longitudes', () => {
      const bearing = calculateBearing(0, -1, 0, 1);
      expect(bearing).toBe(90);
    });
  });

  describe('calculateSpeed', () => {
    it('should calculate speed from distance and time', () => {
      const speed = calculateSpeed(0, 0, 0, 1, 3600); // 1 degree in 1 hour
      expect(speed).toBeGreaterThan(0);
    });

    it('should return 0 for zero time', () => {
      const speed = calculateSpeed(0, 0, 0, 1, 0);
      expect(speed).toBe(0);
    });
  });

  describe('pointInPolygon', () => {
    const square: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0]
    ];

    it('should detect point inside polygon', () => {
      const inside = pointInPolygon([0.5, 0.5], square);
      expect(inside).toBe(true);
    });

    it('should detect point outside polygon', () => {
      const outside = pointInPolygon([2, 2], square);
      expect(outside).toBe(false);
    });

    it('should detect point on boundary', () => {
      const boundary = pointInPolygon([0, 0], square);
      expect(boundary).toBe(true);
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates with default precision', () => {
      const formatted = formatCoordinates(52.5200, 13.4050);
      expect(formatted).toBe('52.520000, 13.405000');
    });

    it('should format coordinates with custom precision', () => {
      const formatted = formatCoordinates(52.5200, 13.4050, 2);
      expect(formatted).toBe('52.52, 13.41');
    });
  });

  describe('generateTouristToken', () => {
    it('should generate a tourist token', () => {
      const token = generateTouristToken('test-tourist-id');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should generate different tokens for different IDs', () => {
      const token1 = generateTouristToken('id1');
      const token2 = generateTouristToken('id2');
      expect(token1).not.toBe(token2);
    });
  });

  describe('parseTouristToken', () => {
    it('should parse a valid tourist token', () => {
      const touristId = 'test-tourist-id';
      const token = generateTouristToken(touristId);
      const parsed = parseTouristToken(token);

      expect(parsed).toBeTruthy();
      expect(parsed?.touristId).toBe(touristId);
      expect(parsed?.type).toBe('tourist');
    });

    it('should return null for invalid token', () => {
      const parsed = parseTouristToken('invalid-token');
      expect(parsed).toBeNull();
    });

    it('should return null for non-base64 token', () => {
      const parsed = parseTouristToken('not-base64');
      expect(parsed).toBeNull();
    });
  });
});
