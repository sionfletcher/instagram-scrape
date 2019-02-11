var cheerio = require('cheerio');
var request = require('request');
var rp = require('request-promise');
var fs = require('fs');

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
                // console.log('found!');
                // console.log(html)
                html = html.replace('window._sharedData = ', '').slice(0, -1);
                var json = JSON.parse(html);
                var edges = json.entry_data.LocationsPage[0].graphql.location.edge_location_to_media.edges;//edge_media_to_caption
                for (var i = 0; i < edges.length; i++) {
                    var node = edges[i].node;
                    if (node.is_video) { continue; }

                    // check if file already exists and skip if so...
                    var url = node.display_url;
                    const file = fs.createWriteStream(`./images/${node.id}.jpg`);
                    request.get(url).pipe(file);

                    var text = node.edge_media_to_caption.edges.reduce((prev, curr) => prev + ' ' + curr.node.text, ' ');
                    console.log(text);
                }
            }
        })
    })
    .catch(function (err) {
        console.log(err);
        // Crawling failed or Cheerio choked...
    });