// Vitest setup: jest-dom matchers and small shims for jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

vi.mock('react-markdown', () => ({
  default: ({ children }) => React.createElement(React.Fragment, null, children),
}));
