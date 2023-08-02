import {
  FullTextAnnotation,
  GoogleVisionResponse,
  ImageTextExtractionOptions,
  RequestBody,
} from '@/types/main';
import fetch from 'node-fetch';

/**
 * A class that provides methods for extracting text from an image using the Google Vision API.
 */
export class ImageTextExtraction {
  /**
   * The URL of the API.
   */
  private readonly API_URL: string;

  /**
   * Constructs a new instance of the ImageTextExtraction class.
   * @param {ImageTextExtractionOptions} options - The options for the image text extraction.
   * @throws {Error} If the API key is not provided or is invalid.
   */
  constructor(options: ImageTextExtractionOptions) {
    this.validateApiKey(options);
    this.API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${options.apiKey}`;
  }

  /**
   * Validates the API key in the provided options object.
   * @param {ImageTextExtractionOptions} options - The options object containing the API key.
   * @throws {Error} If the API key is missing or undefined.
   * @returns None
   */
  private validateApiKey(options: ImageTextExtractionOptions) {
    if (!options || !options.apiKey) {
      throw new Error('API key is required!');
    }
  }

  /**
   * Generates the request body for performing text detection on an image.
   * @param {string} image - The base64 encoded image content.
   * @returns {RequestBody} The request body object.
   */
  private generateBody(image: string): RequestBody {
    return {
      requests: [
        {
          image: {
            content: image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    };
  }

  /**
   * Extracts text from an image using the Google Vision API.
   * @param {string} image - The image to extract text from.
   * @returns {Promise<FullTextAnnotation>} - A promise that resolves to the full text annotation object.
   * @throws {Error} - If the request to the Google Vision API fails or if the response structure is unexpected.
   */
  public async extract(image: string): Promise<FullTextAnnotation> {
    try {
      const body = this.generateBody(image);
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Check if the response status is in the range 200-299 (successful)
      if (!response.ok) {
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const result = (await response.json()) as GoogleVisionResponse;

      if (!result.responses || !result.responses[0]) {
        throw new Error(
          'Unexpected response structure from Google Vision API.',
        );
      }

      const detectedText = result.responses[0].fullTextAnnotation;
      return detectedText || { text: "This image doesn't contain any text!" };
    } catch (error) {
      // Log the original error for debugging purposes
      console.log('Original error:', error);

      // Throw a custom error message
      throw new Error('Error while extracting text from image!');
    }
  }
}
