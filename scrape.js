require('request')
const request = require('request-promise')
const cheerio = require('cheerio')

const {email, password} = require('./globals')

const mechTypes = {
    Global: 0,
    Light: 1,
    Medium: 2,
    Heavy: 3,
    Assault: 4
}
Object.keys(mechTypes).forEach(key => {
    mechTypes[mechTypes[key]] = key
})

const getUrl = (name, type) =>
    `https://mwomercs.com/profile/leaderboards/quickplay?type=${type}&user=${encodeURIComponent(name)}`

async function getUserPage(user, type) {
    const response = await request({
        url: getUrl(user, type),
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

async function downloadAndParsePage(user, type) {
    console.log(`Downloading ${mechTypes[type]} for ${user}`)
    return parseAndReturnData(await getUserPage(user, type))
}

const DELAY_TIME = 2000
async function delayIfDelay(delay = true) {
    if (delay) {
        await sleep(DELAY_TIME)
    }
}

async function getDataForAllTypes(user, delay = true) {
    const data = {}
    await delayIfDelay(delay)
    data.Global = await downloadAndParsePage(user, mechTypes.Global)
    await delayIfDelay(delay)
    data.Light = await downloadAndParsePage(user, mechTypes.Light)
    await delayIfDelay(delay)
    data.Medium = await downloadAndParsePage(user, mechTypes.Medium)
    await delayIfDelay(delay)
    data.Heavy = await downloadAndParsePage(user, mechTypes.Heavy)
    await delayIfDelay(delay)
    data.Assault = await downloadAndParsePage(user, mechTypes.Assault)
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
        const data = await getDataForAllTypes(player.mwomercs_name, true)
        playerData.push({djo_id: player.djo_id, data})
    }

    return playerData
}

module.exports = {
    scrape
}