const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const readlineSync = require('readline-sync');
const moment = require('moment');

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

if (process.argv.length < 3) {
    console.log("You must supply at least one csv file to read from");
    process.exit(1);
}

const accounts = {};
const transactions = [];
for (let i = 2; i < process.argv.length; i++) {
    const fileName = process.argv[i];
    parseCSV(fileName, accounts, transactions);
}

readlineSync.promptLoop(processCommand);

function parseCSV(fileName, accounts, transactions) {
    const csv = fs.readFileSync(fileName, { encoding: 'UTF-8' });
    if (!csv) {
        console.log("The supplied csv file couldn't be read.");
        process.exit(1);
    }
    const records = parse(csv, { columns: true });

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const date = moment(record.Date, 'DD/MM/YYYY');
        const srcAccount = getOrInsert(accounts, record.From, new Account(record.From));
        const dstAccount = getOrInsert(accounts, record.To, new Account(record.To));
        const transaction = new Transaction(srcAccount, dstAccount, date, record.Narrative, Math.round(100 * parseFloat(record.Amount)));
        transactions.push(transaction);
    }
}

function getOrInsert(dict, key, newValue) {
    if (!(key in dict)) {
        dict[key] = newValue;
    }
    return dict[key];
}

function processCommand(input) {
    if (input == 'Quit') {
        return true;
    }
    if (input.startsWith('List ')) {
        const accountName = input.slice(5);
        if (accountName == 'All') {
            console.log("All accounts:");
            for (const account in accounts) {
                if (accounts.hasOwnProperty(account)) {
                    const element = accounts[account];
                    console.log(element.name + " owes " + (element.balance / 100).toFixed(2));
                }
            }
        } else if (accountName in accounts) {
            console.log('Transactions involving ' + accountName + ":");
            let account = accounts[accountName];
            for (let i = 0; i < account.transactions.length; i++) {
                const transaction = account.transactions[i];
                console.log(transaction.date.format('DD/MM/YYYY') + " " + (transaction.amount / 100).toFixed(2) + " from " + transaction.srcAccount.name + " to " + transaction.dstAccount.name + " for " + transaction.reason);
            }
        } else {
            console.log('The specified account doesn\'t exist');
        }
    } else {
        console.log('The available commands are:\nList All: Prints the name of every account and the balance\nList [Account]: Prints a list of all transactions associated with the account\nQuit: Exits the program.');
    }
    return false;
}
