require('request')
const moment = require('moment')
const request = require('request-promise')
const cheerio = require('cheerio')

const {email, password} = require('./globals')
const {saveStats} = require('./djo-db')

const mechTypes = {
    global: 0,
    light: 1,
    medium: 2,
    heavy: 3,
    assault: 4
}
Object.keys(mechTypes).forEach(key => {
    mechTypes[mechTypes[key]] = key
})

const getUrl = (name, type) =>
    `https://mwomercs.com/profile/leaderboards/quickplay?type=${type}&user=${encodeURIComponent(name)}`

async function getUserPage(user, type) {
    return request({
        url: getUrl(user, type),
        gzip: true,
        jar: true
    })
}

function writeToLog(message) {
    var current_time = moment().add(1, 'hours').format('YYYY-MM-DD HH:mm:ss')
    console.log(`${current_time}: ${message}`)
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
    const cols = ['Rank', 'Name', 'Wins', 'Losses', 'W/L', 'Kills', 'Deaths', 'K/D', 'GamesPlayed', 'AverageScore']

    dom(selector).each((i, elem) => {
        data[cols[i]] = dom(elem).text()
    })

    return data
}

async function downloadAndParsePage(user, type) {
    console.log(`Downloading ${mechTypes[type]} class stats for pilot: ${user}`)
    return parseAndReturnData(await getUserPage(user, type))
}

const DELAY_TIME = 1500
async function delayIfDelay(delay = true) {
    if (delay) {
        await sleep(DELAY_TIME)
    }
}

async function getDataForAllTypes(user, delay = true) {
    const data = {}
    for (const mechType in mechTypes) {
        // Skip the reverse-indexed values
        if (parseInt(mechType, 10) == mechType) {
            continue
        }
        await delayIfDelay(delay)
        data[mechType] = await downloadAndParsePage(user, mechTypes[mechType])
    }
    return data
}

async function sleep(ms) {
    return new Promise(res => {
        setTimeout(function () {
            res()
        }, ms)
    })
}

async function scrapeAndSave(players) {
    await login(email, password)

    for (let i = 0; i < players.length; i++) {
        const player = players[i]
        const data = await getDataForAllTypes(player.mwomercs_name, true)

        await saveStats([{djo_id: player.djo_id, djo_name: player.djo_name, data}])
    }
}

module.exports = {
    scrapeAndSave,
    sleep,
    writeToLog
}
