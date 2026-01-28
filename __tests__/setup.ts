// Jest setup file

// Mock global fetch
global.fetch = jest.fn();

// Silence console.warn in tests
global.console.warn = jest.fn();
