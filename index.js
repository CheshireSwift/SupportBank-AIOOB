const fs = require('fs');
const csvToJs = require('csv-parse/lib/sync');
const xmlToJs = require('xml-js').xml2js;
const readlineSync = require('readline-sync');
const moment = require('moment');
const log4js = require('log4js');

class Account {
    constructor(name) {
        this.name = name;
        this.balance = 0;
        this.transactions = [];
    }
}

class Transaction {
    constructor(srcAccount, dstAccount, date, reason, amount) {
        this.srcAccount = srcAccount;
        this.dstAccount = dstAccount;
        this.date = date;
        this.reason = reason;
        this.amount = amount;

        srcAccount.transactions.push(this);
        dstAccount.transactions.push(this);
        srcAccount.balance -= amount;
        dstAccount.balance += amount;
    }
}

log4js.configure({
    appenders: {
        file: {
            type: 'fileSync',
            filename: 'logs/debug.log'
        }
    },
    categories: {
        default: {
            appenders: ['file'],
            level: 'debug'
        }
    }
});
const logger = log4js.getLogger('index.js');
logger.info('Logging Initialised');

if (process.argv.length > 2) {
    console.log('Command line arguments not supported.');
    process.exit(1);
}

const accounts = new Map();
const transactions = [];
readlineSync.promptLoop(processCommand);

function parseFile(fileName) {
    const file = fs.readFileSync(fileName, {encoding: 'UTF-8'});
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
    }else {
        logger.warn(`Failed to import file ${fileName} unsupported type.`);
        console.log('Unsupported filetype');
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
        const srcAccount = getOrCreateAccount(record.from);
        const dstAccount = getOrCreateAccount(record.to);
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

function getOrCreateAccount(name) {
    if (!accounts.has(name)) {
        accounts.set(name, new Account(name));
    }
    return accounts.get(name);
}

function processCommand(input) {
    if (input == 'Quit') {
        logger.info('Quitting');
        return true;
    } else if (input.startsWith('Import ')) {
        const fileName = input.slice(7);
        logger.debug(`Importing file: ${fileName}`);
        parseFile(fileName);
    } else if (input.startsWith('List ')) {
        const accountName = input.slice(5);
        logger.debug(`List command received for account: ${accountName}`);
        if (accountName == 'All') {
            printAllAccounts();
        } else if (accounts.has(accountName)) {
            printAccountInfo(accounts.get(accountName));
        } else {
            logger.debug(`List command received for invalid account: ${accountName}`);
            console.log('The specified account doesn\'t exist');
        }
    } else {
        printHelp(input);
    }
    return false;
}

function printAllAccounts() {
    logger.debug('Listing all accounts.');
    console.log("All accounts:");
    accounts.forEach(account => {
        const balance = (account.balance / 100).toFixed(2);
        console.log(`${account.name} owes ${balance} in total`);
    });
}

function printAccountInfo(account) {
    logger.debug(`Listing transactions for: ${account.name}`);
    console.log(`Transactions involving ${account.name}:`);
    for (let i = 0; i < account.transactions.length; i++) {
        const transaction = account.transactions[i];
        const date = transaction.date.format('DD/MM/YYYY');
        const amount = (transaction.amount / 100).toFixed(2);
        console.log(`[${date}] ${amount} from ${transaction.srcAccount.name} to ${transaction.dstAccount.name} for ${transaction.reason}`);
    }
}

function printHelp(input) {
    logger.debug(`Unrecognised command: ${input}`);
    console.log(`
The available commands are:
Import [File]: Imports the transactions in the specified file
List All: Prints the name of every account and the balance
List [Account]: Prints a list of all transactions associated with the account
Quit: Exits the program.
    `.trim());
}