import { describe, expect, it } from 'vitest';
import { ImageTextExtraction } from '../src';
import assert from 'assert';

describe('ImageTextExtraction', () => {
  it('should throw error if API key is not provided', () => {
    expect(() => {
      new ImageTextExtraction({ apiKey: '' });
    }).toThrowError('API key is required!');
  });

  it('should throw error if API key is undefined', () => {
    expect(() => {
      new ImageTextExtraction({ apiKey: undefined });
    }).toThrowError('API key is required!');
  });

  it('should create an instance if API key is valid', () => {
    const extractor = new ImageTextExtraction({ apiKey: 'test-key' });
    assert.equal(extractor instanceof ImageTextExtraction, true);
  });
});
