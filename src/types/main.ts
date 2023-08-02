export interface ImageTextExtractionOptions {
  apiKey: string;
}

export interface ImageRequest {
  content: string;
}

export interface RequestBody {
  requests: [
    {
      image: ImageRequest;
      features: [
        {
          type: string;
          maxResults: number;
        },
      ];
    },
  ];
}

export interface FullTextAnnotation {
  text: string;
}

export interface GoogleVisionResponse {
  responses: [
    {
      fullTextAnnotation?: FullTextAnnotation;
    },
  ];
}
