require('request')
const request = require('request-promise')
const cheerio = require('cheerio')
const {delayIfDelay, writeToLog, DELAY_TIME} = require('./util')

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

async function getUserPage(playerName, type) {
    return request({
        url: getUrl(playerName, type),
        gzip: true,
        jar: true
    })
}

async function login() {
    // Save cookies in jar
    try {
        await request({
            url: 'https://mwomercs.com/do/login',
            method: 'POST',
            form: {
                email,
                password
            },
            followAllRedirects: true,
            resolveWithFullResponse: true,
            jar: true
        })
    } catch (e) {
        // Rethrow with only the message so that the password doesnt show up in the logs
        throw new Error(e.message)
    }
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

async function downloadAndParsePage(playerName, type) {
    writeToLog(`Downloading ${mechTypes[type]} class stats for pilot: ${playerName}`)
    return parseAndReturnData(await getUserPage(playerName, type))
}

function dataWasReturned(data) {
    return data.global && Object.keys(data.global).length !== 0
}

async function getDataForAllTypes(playerName) {
    const data = {}
    let delay = DELAY_TIME
    // Try again if no data was fetched for the user
    for (let i = 0; i < 2 && !dataWasReturned(data); i++) {
        // The second time we try, try logging in again and increase the delay
        if (i === 1) {
            writeToLog(`Retrying for user ${playerName}`)
            delay *= 2
            delayIfDelay(delay)
            await login()
        }
        for (const mechType in mechTypes) {
            // Skip the reverse-indexed values
            if (parseInt(mechType, 10) == mechType) {
                continue
            }
            await delayIfDelay(delay)
            data[mechType] = await downloadAndParsePage(playerName, mechTypes[mechType])
        }
    }
    return data
}

function datesAreInSameMonth(d1, d2) {
    d1 = new Date(d1)
    d2 = new Date(d2)
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth()
}
async function scrapeAndSave(players) {
    await login()

    for (let i = 0; i < players.length; i++) {
        const player = players[i]
        const data = await getDataForAllTypes(player.mwomercs_name)

        /*
        Only save the data if:
        - There was data
        - There was no data, but the last time this player was updated was not in this month
            - in this case, the data *should* be null, since they have no data for this month
            - If the last time they were updated was in *this* month though, then we assume that
                the reason there was no data is due to some scraping issue, and we avoid deleting their data
         */
        if (dataWasReturned(data) || !datesAreInSameMonth(new Date(), player.last_updated)) {
            await saveStats([{djo_id: player.djo_id, djo_name: player.djo_name, data}])
        } else {
            writeToLog(`Couldnt get recent data for ${player.djo_id} (${player.mwomercs_name})`)
        }

    }
}

module.exports = {
    scrapeAndSave
}
