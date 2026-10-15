import type { ApiDefinition, LoadConfig, Pair, Workspace } from './schema';
export const uid = () => crypto.randomUUID();

export const defaultConfig: LoadConfig = {
  users: 10,
  duration: 60,
  rampUp: 5,
  iterations: 100,
  timeout: 30,
  delay: 100,
  parallel: 1,
  rateLimit: 50,
  thinkTime: true,
  thinkMin: 100,
  thinkMax: 500,
};

export const pair = (key = '', value = ''): Pair => ({ id: uid(), key, value, enabled: true });

export const blankApi = (): ApiDefinition => ({
  id: uid(),
  name: '',
  method: 'GET',
  url: '{{baseUrl}}/api/products',
  selected: true,
  params: [],
  headers: [pair('Content-Type', 'application/json')],
  auth: 'none',
  token: '',
  username: '',
  password: '',
  bodyType: 'none',
  body: '',
  expectedStatus: 0,
  responseContains: '',
  followRedirects: true,
  tags: '',
  useGlobal: true,
  config: { ...defaultConfig },
});

export function seedWorkspace(): Workspace {
  const env = (id: string, name: string, color: string, url: string) => ({
    id,
    name,
    color,
    variables: [
      pair('baseUrl', url),
      pair('apiVersion', 'v1'),
      pair('productId', '1'),
      pair('authToken', ''),
    ],
  });

  const makeApi = (name: string, method: ApiDefinition['method'], path: string) => ({
    ...blankApi(),
    name,
    method,
    url: `{{baseUrl}}${path}`,
    bodyType: method === 'POST' ? ('json' as const) : ('none' as const),
    body: method === 'POST' ? '{\n  "productId": "{{productId}}",\n  "quantity": 1\n}' : '',
  });

  return {
    theme: 'dark',
    retention: 30,
    environments: [
      env('local', 'Local', '#18c89b', 'http://localhost:3000'),
      env('staging', 'Staging', '#a879ff', 'https://staging.api.example.com'),
      env('production', 'Production', '#f56b79', 'https://api.example.com'),
      env('development', 'Development', '#f3b94d', 'http://localhost:3000'),
      env('qa', 'QA', '#6aabff', 'http://localhost:4000'),
    ],
    collections: [
      {
        id: 'ecommerce',
        name: 'E-commerce APIs',
        description: 'Stress test your product, cart, and checkout APIs under realistic load.',
        color: '#4d8dff',
        environmentId: 'local',
        config: { ...defaultConfig },
        apis: [
          makeApi('Get products', 'GET', '/api/products'),
          makeApi('Get product details', 'GET', '/api/products/{{productId}}'),
          makeApi('Add to cart', 'POST', '/api/cart'),
          makeApi('Checkout', 'POST', '/api/checkout'),
          makeApi('Get user profile', 'GET', '/api/users/me'),
        ],
      },
      {
        id: 'payments',
        name: 'Payment APIs',
        description: 'Payment service performance checks.',
        color: '#f3b94d',
        environmentId: 'local',
        config: { ...defaultConfig },
        apis: [
          makeApi('Get payment methods', 'GET', '/api/payments'),
          makeApi('Create payment', 'POST', '/api/payments'),
        ],
      },
      {
        id: 'users',
        name: 'User Management',
        description: 'User service performance checks.',
        color: '#a879ff',
        environmentId: 'local',
        config: { ...defaultConfig },
        apis: [
          makeApi('List users', 'GET', '/api/users'),
          makeApi('Get current user', 'GET', '/api/users/me'),
        ],
      },
    ],
  };
}
