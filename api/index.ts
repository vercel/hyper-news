import { readFileSync } from 'fs'
import { join as joinPath } from 'path'
import { NowRequest, NowResponse } from '@now/node'
import { createTrackStatusCodes } from '@zeit/metrics'
import { satisfies } from 'semver'
import { Url } from 'url'

const trackStatusCodes = createTrackStatusCodes('hyper-news')

// Set Type for Messages
interface Messages {
  text: String,
  url?: Url,
  dismissable: Boolean,
  versions: Array<String>,
  platforms: Array<String>
}[]

// Get news JSON
const news = JSON.parse(readFileSync(joinPath(__dirname, '../news.json'), 'utf-8'))
const legacyNews = JSON.parse(readFileSync(joinPath(__dirname, '../legacy-news.json'), 'utf-8'))

// Match versions (strings) from two sources
const matchVersion = (versions: Array<String>, clientVersion) => (
  versions.some(v => v === '*' || satisfies(clientVersion, v))
)

// Match platform (strings) from two sources
const matchPlatform = (platforms: Array<String>, clientPlatform) => (
  platforms.some(p => p === '*' || p === clientPlatform)
)

// Main function export
export default trackStatusCodes((req: NowRequest, res: NowResponse) => {
  // Get platform and version headers, which should be sent from Hyper.app
  const platform = req.headers['x-hyper-platform']
  const version = req.headers['x-hyper-version']

  // If platform and version aren't defined, assume legacy Hyper version and respond with legacy message
  if (platform === undefined || version === undefined) {
    res.json(legacyNews)
    return
  }

  // Set caching headers
  res.setHeader('Cache-Control', 's-maxage=5 stale-while-revalidate=5')

  // Set message, if there are any found
  const message = news.messages.find((msg: Messages) => (
    matchVersion(msg.versions, version) && matchPlatform(msg.platforms, platform)
  )) || ''

  // Respond with message
  res.json({message})
  return
})
