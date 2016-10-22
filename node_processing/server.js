/*eslint no-console: ["error", { allow: ["log"] }] */

"use strict";

var mongoDb,
    mongoClient,
    mongoUrl,
    uuid,
    instanceUuid,
    checkItemsCollection,
    processItem,
    amqp,
    receiveMessages,
    itemsCollectionName = "items",
    maxErrors = 100,
    errorsCount,
    pollListen;

try {
    uuid = require("uuid");
    instanceUuid = uuid.v4();
    mongoDb = require("mongodb");
    amqp = require("amqplib/callback_api");
    mongoClient = mongoDb.MongoClient;
    mongoUrl = "mongodb://mongo:27017/ordinglc";

    receiveMessages = function (errorCallback) {
        amqp.connect("amqp://rabbitmq_bus", function (err, conn) {
            if (err) {
                errorCallback(err);
            } else {
                console.log("Instance %s - Waiting for messages", instanceUuid);
                conn.createChannel(function (err, ch) {
                    var q = "ordinglc";
                    if (err) {
                        errorCallback(err);
                    } else {
                        try {
                            ch.assertQueue(q, {
                                durable: false
                            });
                            ch.consume(q, function (msg) {
                                processItem(msg.content.toString(), function () {
                                    console.log("Instance %s - Processed item %s", instanceUuid, msg.content.toString());
                                }, function (err) {
                                    errorCallback(err);
                                });
                            }, {
                                noAck: true
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
                    console.log("Instance %s - Processing item %s", instanceUuid, itemId);
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
            receiveMessages(function (error) {
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