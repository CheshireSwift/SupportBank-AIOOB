const log4js = require('log4js');
const fs = require('fs');
const csvToJs = require('csv-parse/lib/sync');
const xmlToJs = require('xml-js').xml2js;
const moment = require('moment');

const { Account, Transaction } = require('./data.js');

const logger = log4js.getLogger('parser.js');

function parseFile(fileName, accounts, transactions) {
    const file = fs.readFileSync(fileName, {encoding: 'utf8'});
    if (!file) {
        logger.fatal(`${fileName} couldn't be read, obtained ${file}`);
        console.log(`The supplied csv file ${fileName} couldn't be read.`);
        process.exit(1);
    }

    let records;
    if (fileName.endsWith('.csv')) {
        logger.info(`Importing file ${fileName} detected type csv.`);
        records = parseCSV(file);
    } else if (fileName.endsWith('.json')) {
        logger.info(`Importing file ${fileName} detected type json.`);
        records = parseJSON(file);
    } else if (fileName.endsWith('.xml')) {
        logger.info(`Importing file ${fileName} detected type xml.`);
        records = parseXML(file);
    } else {
        logger.warn(`Failed to import file ${fileName} unsupported type.`);
        console.log('Unsupported filetype.');
        return;
    }

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        logger.debug(`Importing transaction: ${JSON.stringify(record)}`);
        const date = record.date;
        if (!date.isValid()) {
            logger.warn(`Invalid date in ${fileName} got ${JSON.stringify(record)}`);
            console.log(`Invalid record in ${fileName} due to bad date, skipping.`);
            continue;
        }
        const srcAccount = getOrCreateAccount(accounts, record.from);
        const dstAccount = getOrCreateAccount(accounts, record.to);
        const amount = Math.round(100 * parseFloat(record.amount));
        if (!amount) {
            logger.warn(`Invalid amount in ${fileName} got ${JSON.stringify(record)}`);
            console.log(`Invalid record in ${fileName} due to bad amount, skipping.`);
            continue;
        }
        const transaction = new Transaction(srcAccount, dstAccount, date, record.reason, amount);
        transactions.push(transaction);
    }
}

function getOrCreateAccount(accounts, name) {
    if (!accounts.has(name)) {
        accounts.set(name, new Account(name));
    }
    return accounts.get(name);
}

function parseCSV(input) {
    return csvToJs(input, {columns: true}).map(record => ({
        date: moment(record.Date, 'DD/MM/YYYY'),
        from: record.From,
        to: record.To,
        amount: parseFloat(record.Amount),
        reason: record.Narrative,
    }));
}

function parseJSON(input) {
    return JSON.parse(input).map(record => ({
        date: moment(record.Date),
        from: record.FromAccount,
        to: record.ToAccount,
        amount: parseFloat(record.Amount),
        reason: record.Narrative,
    }));
}

function parseXML(input) {
    let parsed = xmlToJs(input, {compact: true});
    return parsed.TransactionList.SupportTransaction.map(record => ({
        date: moment({year: 1900, month: 0, day: 1}).add(parseInt(record._attributes.Date), 'd'),
        from: record.Parties.From._text,
        to: record.Parties.To._text,
        amount: parseFloat(record.Value._text),
        reason: record.Description._text,
    }));
}

function writeFile(fileName, transactions) {
    const file = JSON.stringify(transactions.map(record => ({
        Date: record.date,
        FromAccount: record.srcAccount.name,
        ToAccount: record.dstAccount.name,
        Narrative: record.reason,
        Amount: (record.amount / 100).toFixed(2),
    })), null, 2);
    fs.writeFileSync(fileName, file, {encoding: 'utf8'});
}

module.exports = {
    parseFile,
    writeFile,
};
