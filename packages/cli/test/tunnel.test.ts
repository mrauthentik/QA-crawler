import { isLocalUrl, extractPort } from '../../src/tunnel';

describe('Tunnel Utils', () => {
  describe('isLocalUrl', () => {
    it('should detect localhost URLs', () => {
      expect(isLocalUrl('http://localhost:3000')).toBe(true);
      expect(isLocalUrl('http://localhost:8080')).toBe(true);
    });

    it('should detect 127.0.0.1 URLs', () => {
      expect(isLocalUrl('http://127.0.0.1:3000')).toBe(true);
      expect(isLocalUrl('https://127.0.0.1:8080')).toBe(true);
    });

    it('should detect 0.0.0.0 URLs', () => {
      expect(isLocalUrl('http://0.0.0.0:3000')).toBe(true);
    });

    it('should detect .local URLs', () => {
      expect(isLocalUrl('http://myapp.local:3000')).toBe(true);
      expect(isLocalUrl('http://dev.local')).toBe(true);
    });

    it('should reject external URLs', () => {
      expect(isLocalUrl('https://example.com')).toBe(false);
      expect(isLocalUrl('https://myapp.herokuapp.com')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isLocalUrl('not-a-url')).toBe(false);
      expect(isLocalUrl('')).toBe(false);
    });
  });

  describe('extractPort', () => {
    it('should extract explicit ports', () => {
      expect(extractPort('http://localhost:3000')).toBe(3000);
      expect(extractPort('http://localhost:8080')).toBe(8080);
      expect(extractPort('http://localhost:5000')).toBe(5000);
    });

    it('should default to 80 for http without port', () => {
      expect(extractPort('http://example.com')).toBe(80);
      expect(extractPort('http://localhost')).toBe(80);
    });

    it('should default to 443 for https without port', () => {
      expect(extractPort('https://example.com')).toBe(443);
      expect(extractPort('https://localhost')).toBe(443);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(extractPort('not-a-url')).toBe(3000); // default fallback
    });
  });
});
