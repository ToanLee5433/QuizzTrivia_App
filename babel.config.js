module.exports = {
  // Chỉ transform JS files, không touch TypeScript
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  overrides: [
    {
      test: /\.tsx?$/,
      // Không transform TypeScript files, để ts-jest handle
      presets: [],
      plugins: []
    }
  ]
};
