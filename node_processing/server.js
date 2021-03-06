/*eslint no-console: ["error", { allow: ["log"] }] */

"use strict";

var util,
    mongoDb,
    mongoHost,
    mongoPort,
    mongoClient,
    mongoUrl,
    uuid,
    instanceUuid,
    checkItemsCollection,
    processItem,
    amqp,
    receiveMessage,
    itemsCollectionName = "items",
    rabbitHost,
    rabbitPort,
    rabbitUrl,
    rabbitQueue = "ordinglc",
    delay = 2000,
    maxErrors = 100,
    errorsCount,
    pollListen;

try {
    util = require("util");
    uuid = require("uuid");
    instanceUuid = uuid.v4();
    mongoDb = require("mongodb");
    mongoHost = process.env.ENV_MONGOHOST;
    mongoPort = process.env.ENV_MONGOPORT;
    amqp = require("amqplib/callback_api");
    mongoClient = mongoDb.MongoClient;
    mongoUrl = util.format("mongodb://%s:%s/ordinglc", mongoHost, mongoPort);
    rabbitHost = process.env.ENV_RABBITHOST;
    rabbitPort = process.env.ENV_RABBITPORT;
    rabbitUrl = util.format("amqp://%s:%s", rabbitHost, rabbitPort);

    receiveMessage = function (successCallback, errorCallback) {
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
                            ch.get(rabbitQueue, {
                                noAck: true
                            }, function (err, msgOrFalse) {
                                if (err) {
                                    errorCallback(err);
                                } else {
                                    if (msgOrFalse) {
                                        processItem(msgOrFalse.content.toString(), function () {
                                            console.log("Instance %s - Processed item %s", instanceUuid, msgOrFalse.content.toString());
                                        }, function (err) {
                                            errorCallback(err);
                                        });
                                    }
                                    successCallback();
                                }
                            });
                        } catch (ex) {
                            errorCallback(err);
                        }
                    }
                });
            }
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

    processItem = function (itemId, successCallback, errorCallback) {
        mongoClient.connect(mongoUrl, function (err, database) {
            if (!database) {
                errorCallback("MongoDB database is null");
            } else {
                checkItemsCollection(database, function (collection) {
                    collection.updateOne({
                        "itemId": itemId
                    }, {
                        $set: {
                            "isProcessed": true
                        }
                    }, function (err, object) {
                        if (err) {
                            errorCallback(err);
                        } else {
                            successCallback();
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

    errorsCount = 0;

    pollListen = function () {
        if (errorsCount <= maxErrors) {
            receiveMessage(function () {
                setTimeout(pollListen, delay);
            }, function (error) {
                console.log("Instance %s - Error: %s", instanceUuid, error);
                setTimeout(pollListen, 5000);
            });
        } else {
            console.log("Instance %s - Max Errors: %s", instanceUuid);
        }
    };

    pollListen();
} catch (error) {
    console.log("Instance %s - Error: %s", instanceUuid, error);
}