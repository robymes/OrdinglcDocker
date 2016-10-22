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
    itemsCollectionName = "items";

try {
    uuid = require("uuid");
    instanceUuid = uuid.v4();
    mongoDb = require("mongodb");
    amqp = require("amqplib/callback_api");
    mongoClient = mongoDb.MongoClient;
    mongoUrl = "mongodb://mongo:27017/ordinglc";

    receiveMessages = function (errorCallback) {
        amqp.connect("amqp://rabbitmq_bus", function (err, conn) {
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
                            processItem(msg, function () {
                                console.log("Instance %s - Processed item %s", instanceUuid, msg);
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
                    collection.findAndModify({
                        itemId: itemId
                    }, {
                        $set: {
                            isProcessed: true
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

    console.log("Data processig server waiting for messages");
    receiveMessages(function (error) {
        console.log("Instance %s - Error: %s", instanceUuid, error);
    });
} catch (error) {
    console.log("Instance %s - Error: %s", instanceUuid, error);
}