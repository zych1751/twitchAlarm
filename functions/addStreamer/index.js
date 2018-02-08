const AWS = require('aws-sdk');
const db = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
const request = require('request');
const querystring = require('querystring');

exports.handle = (event, context, callback) => {
    event = querystring.parse(event.body);

    const id = event.text;
    const tableName = process.env.TABLE_NAME;

    request({
        headers: {
            "Client-ID": process.env.TWITCH_CLIENT_ID
        },
        uri: "https://api.twitch.tv/kraken/users/" + id,
    }, (err, res, body) => {
        if(err) {
            callback(null, getSlackFormat("Internal Server Error"));
        } else {
            var json = JSON.parse(body);
            var getSlackFormat = (text) => {
                return {
                    "response_type": "in_channel",
                    "text": text
                };
            };

            if(json.status == 404) {
                callback(null, getSlackFormat("해당 스트리머를 찾지 못하였습니다."));
            } else {
                const channelName = json.display_name;

                // db query

                var params = {
                    TableName: tableName,
                    KeyConditionExpression: "id=:id",
                    ExpressionAttributeValues: {
                        ":id": id
                    }
                }

                docClient.query(params, (err, data) => {
                    if(err) {
                        console.error("Unable to Query. Error: ", JSON.stringify(err, null, 2));
                        callback(null, getSlackFormat("Internal Server Error"));
                    } else {
                        if(data.Items.length == 1) {
                            callback(null, getSlackFormat(channelName + "은(는) 이미 존재합니다."));
                        } else {
                            params = {
                                TableName: tableName,
                                Item: {
                                    "id": id,
                                    "channelName": channelName,
                                    "onlineStatus": "off"
                                }
                            };
                            docClient.put(params, (err, data) => {
                                if(err) {
                                    console.error("Unable to add. Error JSON: ", JSON.stringify(err, null, 2));
                                    callback(null, getSlackFormat("Internal Server Error"));
                                } else {
                                    callback(null, getSlackFormat(channelName + "을(를) 추가하였습니다."));
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}
