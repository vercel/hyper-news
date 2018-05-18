const trackStatusCodes = require("@zeit/metrics/http-status")("hyper-news");
const {join: joinPath} = require('path')
const {parse: parseUrl} = require('url')
const {readFileSync} = require('fs')

const {satisfies} = require('semver')

const news = JSON.parse(readFileSync(joinPath(__dirname, 'news.json'), 'utf-8'))
const legacyNews = JSON.parse(readFileSync(joinPath(__dirname, 'legacy-news.json'), 'utf-8'))

const matchVersion = (versions, clientVesion) => (
  versions.some(v => v === '*' || satisfies(clientVesion, v))
)

const matchPlatform = (platforms, clientPlatform) => (
  platforms.some(p => p === '*' || p === clientPlatform)
)

module.exports = trackStatusCodes(async function (req) {
  const platform = req.headers['x-hyper-platform']
  const version = req.headers['x-hyper-version']
  const {pathname} = parseUrl(req.url)

  if (pathname === '/current') {
    return [...news.messages, latestReleaseNews]
  }

  if (platform === undefined || version === undefined) {
    return legacyNews
  }

  const message = news.messages.find(msg => (
    matchVersion(msg.versions, version) && matchPlatform(msg.platforms, platform)
  )) || ''

  return {message}
})
