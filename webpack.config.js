const path = require('path');
const webpack = require('webpack');
const childProcess = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const apiMocker = require('connect-api-mocker');
const OptimizeCSSAssertsPlugin = require('optimize-css-assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const mode = process.env.NODE_ENV || 'development';

module.exports = {
    mode,
    entry: {
        main: './src/app.js'
    },
    output: {
        path: path.resolve('./dist'),
        filename: '[name].js'
    },
    devServer: {
        overlay: true,
        hot: true,
        proxy: {
            '/api': 'http://localhost:8081'
        },
        before: app => {
            app.use(apiMocker('/api', '/mocks/api'));
        }
    },
    optimization: {
        minimizer:
            mode === 'production'
                ? [
                      new OptimizeCSSAssertsPlugin(), // CSS를 압축한다.
                      new TerserPlugin({
                          terserOptions: {
                              compress: {
                                  drop_console: true // 콘솔 로그를 제거한다.
                              }
                          }
                      })
                  ]
                : [],
        splitChunks: {
            chunks: 'all' // 중복코드를 다른 js 파일에 생성
        }
    },
    // 코드에서 사용하더라도 번들에 포함하지 않고 빌드한다. 대신 이를 전역변수로 접근하도록 한다.
    externals: {
        axios: 'axios'
    },
    module: {
        rules: [
            {
                test: /\.(scss|css)$/,
                use: [process.env.NODE_ENV === 'production' ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader', 'sass-loader']
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/,
                loader: 'url-loader',
                options: {
                    name: '[name].[ext]?[hash]',
                    limit: 20000
                }
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        // 번들링된 결과물 상단에 빌드정보를 추가하는 플러그인 - 배포 됐는지 확인을 위해 사용
        new webpack.BannerPlugin({
            banner: `
                Build Date: ${new Date().toLocaleString()}
                Commit Version: ${childProcess.execSync('git rev-parse --short HEAD')}
                Author: ${childProcess.execSync('git config user.name')}
            `
        }),
        // 빌드타임에 결정되는 환경변수를 어플리케이션단에 주입할 떄 사용하는 플러그인 - api 주소 등
        new webpack.DefinePlugin({
            TWO: '1+1',
            THREE: JSON.stringify('1+2'),
            'api.domain': JSON.stringify('http://dev.api.domain.com')
        }),
        // 빌드과정에 HTML을 포함해서 동적으로 생성되는 js, css 빌드타임에 결정되는 값들을 템플릿에 넣을 수 있게해주는 플러그인
        new HtmlWebpackPlugin({
            template: './src/index.html',
            templateParameters: {
                env: process.env.NODE_ENV === 'development' ? '(개발용)' : ''
            },
            minify:
                process.env.NODE_ENV === 'production'
                    ? {
                          collapseWhitespace: true,
                          removeComments: true
                      }
                    : false
        }),
        // 빌드할때마다 output 폴더를 삭제해주는 플러그인
        new CleanWebpackPlugin(),
        // 번들된 js에서 css 파일을 따로 추출하는 플러그인
        ...(process.env.NODE_ENV === 'production'
            ? [
                  new MiniCssExtractPlugin({
                      filename: '[name].css'
                  })
              ]
            : []),
        // 원하는 파일을 entry 경로에 카피한다.
        new CopyPlugin({
            patterns: [
                {
                    from: './node_modules/axios/dist/axios.min.js',
                    to: './axios.min.js'
                }
            ]
        })
    ]
};
