const
  path = require('path'),
  CopyWebpackPlugin = require('copy-webpack-plugin'),
  webpackAngularExternals = require('webpack-angular-externals'),
  WebpackShellPlugin = require('webpack-shell-plugin'),
  nodeExternals = require('webpack-node-externals');

module.exports = (name) => ({
    context: path.resolve(__dirname, `./`),

    entry: {
      [name]: `${__dirname}/${name}/index.ts`
    },

    output: {
      path: path.resolve(__dirname, `./../dist/@magic/${name}`),
      filename: 'index.js',
      library: name,
      libraryTarget: "umd"
    },


    devtool: "eval-source-map",
    resolve: {
      alias: {
        '@magic/mscorelib': 'projects/mscorelib',
        '@magic/utils': 'projects/utils',
        '@magic/engine': 'projects/engine',
        '@magic/gui': 'projects/gui'
      },
      // Add `.ts` and `.tsx` as a resolvable extension.
      extensions: ['.ts', '.tsx', '.js'] // note if using webpack 1 you'd also need a '' in the array as well
    },
    module: {
      loaders: [ // loaders will work with webpack 1 or 2; but will be renamed "rules" in future
        // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
        {test: /\.tsx?$/, loader: 'ts-loader'}
      ]
    },
    plugins: [
      new CopyWebpackPlugin([
        {from: `./${name}/.npmignore`},
        {from: `./${name}/package.json`},
        {from: `./${name}/src`, to: './src'},

      ]),

      new WebpackShellPlugin({
        onBuildStart: [],
        onBuildEnd: [
          // `node_modules\\.bin\\cpx.cmd ..\\..\\dist\\ ..\\..\\node_modules`,
        ]
      })

    ],
    externals: [
      webpackAngularExternals(),
      'rxjs',
      'xml2js',
      /^@angular\//,
      /^@magic\//,
      '@magic/mscorelib',
      '@magic/utils',
      '@magic/gui',
      '@magic/engine',
      "stacktrace-js",
      "error-stack-parser",
      "moment",
      "timers",
      "stackframe",
      "sync-request",
      "http-response-object",

      /*nodeExternals({
        // modulesDir: `./projects/${name}/node_modules`
      })*/
    ]

  }
);
