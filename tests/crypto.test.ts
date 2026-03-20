/**
 * Security-focused tests for the crypto module.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

// A valid 64-char hex key for testing
const TEST_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

describe("crypto — encrypt / decrypt", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("encrypts and decrypts a simple string", () => {
    const plaintext = "sk-test-1234567890abcdef";
    const encrypted = encrypt(plaintext);

    // Encrypted value should be base64 and different from plaintext
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "sk-test-repeating-key";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);

    expect(a).not.toBe(b);

    // Both should decrypt to the same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles long API keys", () => {
    const longKey = "sk-" + "a".repeat(500);
    const encrypted = encrypt(longKey);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(longKey);
  });

  it("handles unicode characters", () => {
    const text = "key-with-unicode-\u00e9\u00e8\u00ea-\u4e16\u754c";
    const encrypted = encrypt(text);
    expect(decrypt(encrypted)).toBe(text);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("test-key");
    // Flip a character in the middle of the base64 string
    const tampered =
      encrypted.slice(0, 10) +
      (encrypted[10] === "A" ? "B" : "A") +
      encrypted.slice(11);

    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on invalid payload (too short)", () => {
    expect(() => decrypt("dG9vc2hvcnQ=")).toThrow("too short");
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;

    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");

    process.env.ENCRYPTION_KEY = original;
  });

  it("throws when ENCRYPTION_KEY is wrong length", () => {
    const original = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "tooshort";

    expect(() => encrypt("test")).toThrow("64-character");

    process.env.ENCRYPTION_KEY = original;
  });
});
