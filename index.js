const {join: joinPath} = require('path')
const {parse: parseUrl} = require('url')
const {readFileSync} = require('fs')

const got = require('got')
const ms = require('ms')
const {satisfies} = require('semver')

const news = JSON.parse(readFileSync(joinPath(__dirname, 'news.json'), 'utf-8'))
const legacyNews = JSON.parse(readFileSync(joinPath(__dirname, 'legacy-news.json'), 'utf-8'))
let latestReleaseNews

// fetches the latest release from github
// useful because we want hyper-news to notify our linux users that a new version is
// available – there's no auto updates there
function fetchLatestRelease() {
  got('https://api.github.com/repos/zeit/hyper/releases', {json: true})
    .then(res => res.body[0])
    .then(release => {
      latestReleaseNews = {
        text: `Version ${release.tag_name} is available. ${release.body.split('\n')[0]}`,
        url: `https://github.com/zeit/hyper/releases/tag/${release.tag_name}`,
        dismissable: true,
        versions: [`< ${release.tag_name}`],
        platforms: ['linux']
      }
    })
    .catch(console.log)
}

const matchVersion = (versions, clientVesion) => (
  versions.some(v => v === '*' || satisfies(clientVesion, v))
)

const matchPlatform = (platforms, clientPlatform) => (
  platforms.some(p => p === '*' || p === clientPlatform)
)

fetchLatestRelease()
setInterval(() => fetchLatestRelease(), ms('2m'))

module.exports = async function (req) {
  const platform = req.headers['x-hyper-platform']
  const version = req.headers['x-hyper-version']
  const {pathname} = parseUrl(req.url)

  if (pathname === '/current') {
    return [...news.messages, latestReleaseNews]
  }

  if (platform === undefined || version === undefined) {
    return legacyNews
  }

  // NOTE: if the user is running an outdated version,
  // the update news will always be sent instead of
  // any other news defined on news.json
  if (platform === 'linux') {
    if (matchVersion(latestReleaseNews.versions, version)) {
      return {message: latestReleaseNews}
    }
  }

  const message = news.messages.find(msg => (
    matchVersion(msg.versions, version) && matchPlatform(msg.platforms, platform)
  )) || ''

  return {message}
}
