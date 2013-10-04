var gradient_detail = 256;
var copyright_stuff = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';
var fromRgb=function(r,g,b){r/=255,g/=255,b/=255;var max=Math.max(r,g,b),min=Math.min(r,g,b);var h,s,l=(max+min)/2;if(max==min){h=s=0}else{var d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}h/=6}return[h,s,l]};
var toRgb=function(h,s,l){var r,g,b;if(s==0){r=g=b=l}else{function hue2rgb(p,q,t){if(t<0){t+=1}if(t>1){t-=1}if(t<1/6){return p+(q-p)*6*t}if(t<1/2){return q}if(t<2/3){return p+(q-p)*(2/3-t)*6}return p}var q=l<0.5?l*(1+s):l+s-l*s;var p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3)}return[r*255,g*255,b*255]};

var decimal_to_color = function(decimal){
    var rgb = toRgb(decimal, 1, 0.5);
    return 'rgb('+Math.floor(rgb[0])+','+Math.floor(rgb[1])+','+Math.floor(rgb[2])+')';
};
var chain = function(array, cb){
    for (var i = 0; i < array.length-1; i++){
        cb(array[i], array[i+1]);
    }
}
var map = L.map('map');
map.zoomControl.setPosition("topright");
var geo = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: copyright_stuff}).addTo(map);

$.getJSON('data.json').done(function(data){
    $(document).ready(function(){
        var points = data.points.map(function(point){
            return ({
                latlng: point.latlng,
                when: new Date(point.when)
            });
        });
        var start_time = points[0].when;
        var end_time = points.slice(-1)[0].when;
        var total_time = end_time - start_time;
        points.forEach(function(point){
            point.time = (point.when - start_time) / total_time;
        });
        chain(points, function(pa, pb){
            var start = Math.floor(pa.time * gradient_detail);
            var end = Math.floor(pb.time * gradient_detail);
            var length = end-start+1;
            for (var i = 0; i < length; i++){
                var color = decimal_to_color((start+i) / gradient_detail);
                var x1 = (pb.latlng[0]-pa.latlng[0])*i/length+pa.latlng[0];
                var x2 = (pb.latlng[0]-pa.latlng[0])*(i+1)/length+pa.latlng[0];
                var y1 = (pb.latlng[1]-pa.latlng[1])*i/length+pa.latlng[1];
                var y2 = (pb.latlng[1]-pa.latlng[1])*(i+1)/length+pa.latlng[1];
                L.polyline([[x1,y1], [x2,y2]], {
                    color: color,
                    opacity: 1,
                    weight: 6
                }).addTo(map);
            }
        });
        map.setView(points.slice(-1)[0].latlng, 4);
    });
}).fail(function(error){
    throw error; //***
});

/* use browser geolocation
map.on('locationfound', function(location){L.marker(location.latlng).addTo(map); map.setView(location.latlng, 8);});
map.on('locationerror', function(error){});
map.locate();*/
