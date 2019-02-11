var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
var fs = require('fs');
var _ = require('lodash');

var admin = require('firebase-admin');

var serviceAccount = require(__dirname + '/memorial-6ca32-firebase-adminsdk-sz33y-5c4b24ebe3.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://memorial-6ca32.firebaseio.com',
    storageBucket: 'gs://memorial-6ca32.appspot.com'
});

var options = {
    uri: 'https://www.instagram.com/explore/locations/213676284/memorial-to-the-murdered-jews-of-europe/',
    transform: function (body) {
        return cheerio.load(body);
    }
};

rp(options)
    .then(function ($) {

        $('script').each((i, e) => {
            var html = $(e).html().toString();
            if (html.indexOf('window._sharedData =') >= 0) {
                html = html.replace('window._sharedData = ', '').slice(0, -1);
                var json = JSON.parse(html);
                var edges = json.entry_data.LocationsPage[0].graphql.location.edge_location_to_media.edges;//edge_media_to_caption

                var promises = _.map(edges, (edge) => {

                    return new Promise((resolve, reject) => {

                        var node = edge.node;

                        if (node.is_video) { resolve(); }

                        var tags = node.edge_media_to_caption.edges.reduce((prev, curr) => prev + ' ' + curr.node.text, ' ');

                        return admin.firestore().doc(`images/${node.id}`).set({
                            tags
                        }).then(() => {

                            var url = node.display_url;
                            const file = fs.createWriteStream(`./images/${node.id}.jpg`);

                            request.get(url).pipe(file);
    
                            file.on('finish', () => {
                                admin.storage().bucket().upload(`./images/${node.id}.jpg`, {})
                                    .then((res) => {
                                        return res[0].makePublic().then(() => {
                                            admin.firestore().doc(`images/${node.id}`).update({
                                                url: res[1].mediaLink
                                            })
                                        });
                                    })
                            });
                        })

                    });
                });

            }
        })
    })
    .catch(function (err) {
        console.log(err);

    });