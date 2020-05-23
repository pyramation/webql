# webql

Creates the PostGraphile explorer for *EVERY* database and schema on your machine. 

```sh
npm install -g webql-cli
```

Then run the explorer!

```
webql
```

Should be running on http://localhost:5555

## the idea

the idea is to use this for development only, as your `postgres` user. Don't deploy this in production.

## changing port

```sh
export SERVER_PORT=5656
webql
```
## troubleshooting

currently these are the assumptions, you can export them if you have your own values:

```sh
PGUSER=postgres
PGHOST=localhost
PGPASSWORD=password
PGPORT=5432
```

If you have your own password for example

```sh
export PGPASSWORD=mypassword
export SERVER_PORT=5656
webql
```