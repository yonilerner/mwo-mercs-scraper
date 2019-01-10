require('request')
const request = require('request-promise')
const cheerio = require('cheerio')

const {email, password} = require('./globals')

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

async function sleep(ms) {
    return new Promise(res => {
        setTimeout(function () {
            res()
        }, ms)
    })
}

async function scrape(players) {
    await login(email, password)

    const playerData = []
    for (let i = 0; i < players.length; i++) {
        const player = players[i]
        const page = await getUserPage(player.mwomercs_name)
        const data = await parseAndReturnData(page)
        playerData.push({djo_id: player.djo_id, data})
    }

    return playerData
}

module.exports = {
    scrape
}