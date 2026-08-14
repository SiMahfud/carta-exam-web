import '@testing-library/jest-dom';
import React from 'react';

// Make React globally available for JSX runtime in happy-dom test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).React = React;
