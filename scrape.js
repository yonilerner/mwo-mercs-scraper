require('request')
const request = require('request-promise')
const cheerio = require('cheerio')
const {delayIfDelay, writeToLog, DELAY_TIME} = require('./util')

const {email, password} = require('./globals')
const {saveStats} = require('./djo-db')

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
    writeToLog(`Getting ${mechTypes[type]} stats for pilot ${playerName}`)
    return parseAndReturnData(await getUserPage(playerName, type))
}

function dataWasReturned(data) {
    return data.Global && Object.keys(data.Global).length !== 0
}

async function getDataForAllTypes(playerName) {
    const data = {}
    let delay = DELAY_TIME
    // Try again if no data was fetched for the user
for (let i = 0; i < 2 && !dataWasReturned(data); i++) {
    // The second time we try, try logging in again and increase the delay
    if (i === 1) {
        writeToLog(`Retrying for pilot ${playerName}`)
        delay *= 2
        await delayIfDelay(delay)
        await login()
    }
    for (const mechType in mechTypes) {
        // Skip the reverse-indexed values
        if (parseInt(mechType, 10) == mechType) {
            continue
        }
        await delayIfDelay(delay)
        data[mechType] = await downloadAndParsePage(playerName, mechTypes[mechType])
        if (!dataWasReturned(data)) {
            writeToLog(`Failed to find stats for pilot ${playerName}, inactive?`)
            break
        }
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
        // Adjustment because seasons reset at 7PM CST, not midnight
        let seasonResetTime = new Date();
        seasonResetTime.setHours(seasonResetTime.getHours() + 5);

        /*
        Only save the data if:
        - There was data
        - There was no data, but the last time this player was updated was not in this month
            - in this case, the data *should* be null, since they have no data for this month
            - If the last time they were updated was in *this* month though, then we assume that
                the reason there was no data is due to some scraping issue, and we avoid deleting their data
         */
        if (dataWasReturned(data) || !datesAreInSameMonth(seasonResetTime, player.last_updated)) {
            await saveStats([{djo_id: player.djo_id, djo_name: player.djo_name, data}])
        } else {
            writeToLog(`Couldn't update stats for member ${player.djo_name} (ID: ${player.djo_id})`)
        }

    }
}

module.exports = {
    scrapeAndSave
}