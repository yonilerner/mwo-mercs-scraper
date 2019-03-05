const {DB_HOST, DB_PASS, DB_NAME, DB_USER} = require('./globals')
const {writeToLog} = require('./util')

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
    const ret = await new Promise(((resolve, reject) => {
        conn.query(sql, params, (error, results, fields) => {
            if (error) {
                reject(error)
            } else {
                resolve(results)
            }
        })
    }))
    await disconnect(conn)
    return ret
}

async function getPlayers() {
    const rows = await query(`
    SELECT
        master.id                     AS djo_id,
        master.name                   AS djo_name,
        bios.im_mwo                   AS mwo_name,
        gameapis_mwo_players.mwo_name AS mwo_name_manual,
        gameapis_mwo_mwomercs.last_updated,
        access.club_id
    FROM access
        LEFT JOIN master ON access.player_id = master.id
        LEFT JOIN bios ON master.id = bios.player_id
        LEFT JOIN gameapis_mwo_players ON master.id = gameapis_mwo_players.djo_id
        LEFT JOIN gameapis_mwo_mwomercs ON master.id = gameapis_mwo_mwomercs.djo_id
        INNER JOIN club_games ON club_games.club_id=access.club_id
        INNER JOIN new_clubs ON new_clubs.id=access.club_id
    WHERE
        (bios.im_mwo != '' OR gameapis_mwo_players.mwo_name != '')
        AND access.status = 'Active' AND new_clubs.clubhide=0
        AND club_games.game_id=399
    GROUP BY
        master.id
    ORDER BY
        master.name
    `)
    rows.forEach(row => {
        if (row.mwo_name_manual) {
             row.mwomercs_name = row.mwo_name_manual
        } else {
             row.mwomercs_name = row.mwo_name
        }
    })
    return rows
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
    writeToLog(`Updating stats for member ${players.map(p => `${p.djo_name} (ID: ${p.djo_id})`).join(',')}`)
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
