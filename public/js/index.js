var copyright_stuff = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';


var fromRgb = function(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}
var toRgb = function(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
}
var decimal_to_color = function(decimal){
    var rgb = toRgb(decimal, 1, 0.5);
    return 'rgb('+Math.floor(rgb[0])+','+Math.floor(rgb[1])+','+Math.floor(rgb[2])+')';
};


var map = L.map('map');
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: copyright_stuff
}).addTo(map);


$.getJSON('data.json').done(function(data){
    $(document).ready(function(){
        var points = [];
        data.points.forEach(function(point){
            var latlng = [point.latitude, point.longitude];
            var when = new Date(point.when);
            points.push({latlng: latlng, when: when});
        });
        var journey_start_time = points[0].when;
        var journey_end_time = points.slice(-1)[0].when;
        for (var i = 0; i < points.length-1; i++){
            var middle_time = (Number(points[i].when)+Number(points[i+1].when))/2;
            var decimal = (middle_time - journey_start_time) / (journey_end_time - journey_start_time);
            L.polyline([points[i].latlng, points[i+1].latlng], {
                color: decimal_to_color(decimal),
                opacity: 1,
                weight: 6
            }).addTo(map);
        }
        map.setView(points.slice(-1)[0].latlng, 4);
    });
}).fail(function(error){
    throw error;
});


/* use browser geolocation
map.on('locationfound', function(location){L.marker(location.latlng).addTo(map); map.setView(location.latlng, 8);});
map.on('locationerror', function(error){});
map.locate();*/
