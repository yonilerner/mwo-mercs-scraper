require('request')
const request = require('request-promise')
const cheerio = require('cheerio')
const qs = require('querystring')

const user = 't h u n d e r m a x'

const getUrl = name => `https://mwomercs.com/profile/leaderboards/quickplay?type=0&user=${encodeURIComponent(name)}`

async function getUserPage(user) {
  const response = await request({
    url: getUrl(user),
    gzip: true,
    jar: true
  })
  return response
}

async function login(username, password) {
  // Save cookies in jar
  await request({
    url: 'https://mwomercs.com/do/login',
    method: 'POST',
    form: {
      email: username,
      password
    },
    followAllRedirects: true,
    resolveWithFullResponse: true,
    jar: true
  })
}

function parseAndReturnData(html) {
  const dom = cheerio.load(html)
  const selector = '#contentBody table tr.userRankRow td'
  
  const data = {}
  const cols = ['Rank', 'Name', 'Wins', 'Losses', 'W/L', 'Kills', 'Deaths', 'K/D', 'Games PLayed', 'AverageScore']
  
  dom(selector).each((i, elem) => {
    data[cols[i]] = dom(elem).text()
  })

  return data
}

async function run() {
  await login(process.env.EMAIL, process.env.PASSWORD)
  const page = await getUserPage(user)
  const data = await parseAndReturnData(page)
  console.log(data)
  return data
}

run()
