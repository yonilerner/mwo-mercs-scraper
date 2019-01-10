const {DB_HOST, DB_PASS, DB_NAME, DB_USER} = require('./globals')


async function connect() {
    const conn = require('mysql').createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASS,
        database: DB_NAME
    })
    return new Promise((resolve, reject) => {
        conn.connect((error) => {
            if (error) {
                reject(error)
            } else {
                resolve(conn)
            }
        })
    })
}
async function disconnect(conn) {
    return new Promise((resolve, reject) => {
        conn.end((error) => {
            if (error) {
                reject(error)
            } else {
                resolve()
            }
        })
    })
}

async function query(sql, params) {
    const conn = await connect()
    await new Promise(((resolve, reject) => {
        conn.query(sql, params, (error, results, fields) => {
            if (error) {
                reject(error)
            } else {
                resolve(results)
            }
        })
    }))
    await disconnect(conn)
}

process.on('unhandledRejection', e => {
    console.error('Unhandled rejection', e)
    process.exit()
})

async function getPlayers() {
    return [
        {djo_id: 66143, mwomercs_name: 't h u n d e r m a x'}
    ]
}

/*
[
{
djo_id: number,
data: data from API
}
]
 */
async function saveStats(players) {
    let sql = `
    INSERT INTO gameapis_mwo_mwomercs
    (djo_id, last_updated, data) VALUES
    `
    sql += players
        .map(player => `(${player.djo_id}, CURRENT_TIMESTAMP, ?)`)
        .join(',')

    sql += `
    ON DUPLICATE KEY UPDATE last_updated=VALUES(last_updated), data=VALUES(data)
    `
    await query(sql, players.map(player => JSON.stringify(player.data)))
}

module.exports = {
    getPlayers,
    saveStats
}