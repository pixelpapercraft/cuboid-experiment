import path from "path";
import * as webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";

const templateContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Cuboid Experiment</title>
    <style>
      body, html { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
  </body>
</html>
`;

const config: webpack.Configuration = {
  mode: "development",
  entry: path.resolve(__dirname, "./src/index"),
  output: {
    path: path.resolve(__dirname, "./dist"),
  },
  resolve: {
    modules: ["node_modules", "src"],
    extensions: [".js", ".json", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.(t|j)sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript",
              },
            },
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      templateContent,
    }),
  ],
};

export default config;
