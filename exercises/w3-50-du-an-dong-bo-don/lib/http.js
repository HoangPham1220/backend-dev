// Bước 1. Xem README.md.

export class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} ${url}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

export async function getJson(url, { maxRetries = 3, baseDelayMs = 50 } = {}) {
  // TODO
}
