// Dev-only: stamps data-inspector-* source locations on JSX so the autopilot
// element picker (src/lib/element-picker.ts) can report where a picked element lives.
module.exports = (api) => ({
  plugins: [
    ["@babel/plugin-syntax-typescript", { isTSX: true }],
    ...(api.env("development") ? ["@react-dev-inspector/babel-plugin"] : []),
  ],
});
