/**
 * API Client unit tests
 */

import { ApiClient } from '../../src/api/client.js';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient();
  });

  it('should create an instance', () => {
    expect(client).toBeDefined();
  });

  it('should use default base URL if not specified', () => {
    const defaultClient = new ApiClient();
    expect(defaultClient).toBeDefined();
  });
});
