/*eslint no-console: ["error", { allow: ["log"] }] */

"use strict";

var express,
    util,
    bodyParser,
    mongoHost,
    mongoPort,
    mongoDb,
    mongoClient,
    mongoUrl,
    itemsCollectionName = "items",
    rabbitHost,
    rabbitPort,
    rabbitUrl,
    rabbitQueue = "ordinglc",
    uuid,
    instanceUuid,
    app,
    server,
    checkItemsCollection,
    insertDbItem,
    amqp,
    sendMessage,
    countItemsByProcessedStatus;

try {
    uuid = require("uuid");
    instanceUuid = uuid.v4();
    util = require("util");
    express = require("express");
    bodyParser = require("body-parser");
    mongoDb = require("mongodb");
    amqp = require("amqplib/callback_api");
    mongoClient = mongoDb.MongoClient;
    app = express();
    mongoHost = process.env.ENV_MONGOHOST;
    mongoPort = process.env.ENV_MONGOPORT;
    mongoUrl = util.format("mongodb://%s:%s/ordinglc", mongoHost, mongoPort);
    rabbitHost = process.env.ENV_RABBITHOST;
    rabbitPort = process.env.ENV_RABBITPORT;
    rabbitUrl = util.format("amqp://%s:%s", rabbitHost, rabbitPort);
    app.use(bodyParser.json());

    sendMessage = function (itemId, successCallback, errorCallback) {
        amqp.connect(rabbitUrl, function (err, conn) {
            if (err) {
                errorCallback(err);
            } else {
                conn.createChannel(function (err, ch) {
                    if (err) {
                        errorCallback(err);
                    } else {
                        try {
                            ch.assertQueue(rabbitQueue, {
                                durable: false
                            });
                            ch.sendToQueue(rabbitQueue, new Buffer.from(itemId));
                            console.log("Message sent with ID %s", itemId);
                            successCallback();
                        } catch (ex) {
                            errorCallback(err);
                        }
                    }
                });
            }
            setTimeout(function () {
                conn.close();
            }, 500);
        });
    };

    checkItemsCollection = function (database, successCallback, errorCallback) {
        database.createCollection(itemsCollectionName, function (err, collection) {
            if (err) {
                errorCallback(err);
            } else {
                successCallback(collection);
            }
        });
    };

    insertDbItem = function (item, successCallback, errorCallback) {
        mongoClient.connect(mongoUrl, function (err, database) {
            if (!database) {
                errorCallback("MongoDB database is null");
            } else {
                checkItemsCollection(database, function (collection) {
                    collection.insertOne(item, {
                        w: 1
                    }, function (err, result) {
                        if (err) {
                            errorCallback(err);
                        } else {
                            console.log("Item added with ID %s", item.itemId);
                            successCallback(result);
                        }
                        database.close();
                    });
                }, function (err) {
                    errorCallback(err);
                    database.close();
                });
            }
        });
    };

    countItemsByProcessedStatus = function (isProcesed, successCallback, errorCallback) {
        mongoClient.connect(mongoUrl, function (err, database) {
            if (!database) {
                errorCallback("MongoDB database is null");
            } else {
                checkItemsCollection(database, function (collection) {
                    collection.count({
                        isProcessed: isProcesed
                    }, function (err, count) {
                        if (err) {
                            errorCallback(err);
                        } else {
                            successCallback(count);
                        }
                        database.close();
                    });
                }, function (err) {
                    errorCallback(err);
                    database.close();
                });
            }
        });
    };

    app.all("/*", function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });

    app.post("/addItem", function (req, res) {
        var itemId = uuid.v4();
        req.body.itemId = itemId;
        req.body.isProcessed = false;
        insertDbItem(req.body, function (result) {
            sendMessage(itemId, function () {
                res.status(201).send({
                    instanceId: instanceUuid,
                    itemId: itemId
                });
            }, function (error) {
                res.status(500).send({
                    error: error
                });
            });
        }, function (error) {
            res.status(500).send({
                error: error
            });
        });
    });

    app.get("/itemsProcessed", function (req, res) {
        countItemsByProcessedStatus(true, function (result) {
            var itemsProcessedCount = result;
            countItemsByProcessedStatus(false, function (result) {
                res.status(200).send({
                    instanceId: instanceUuid,
                    processedCount: itemsProcessedCount,
                    notProcessedCount: result
                });
            }, function (error) {
                res.status(500).send({
                    error: error
                });
            });
        }, function (error) {
            res.status(500).send({
                error: error
            });
        });
    });

    app.get("/ping", function (req, res) {
        res.status(200).send({
            instanceId: instanceUuid
        });
    });

    server = app.listen(8080, function () {
        var host = server.address().address,
            port = server.address().port;
        console.log("Data ingestion server listening at http://%s:%s", host, port);
    });
} catch (error) {
    console.log("Error: %s", error);
}