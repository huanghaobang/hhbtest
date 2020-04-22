/*
    Global Data Variables
*/


var filtered_covid_data;
var covid_data;
var country_data;
var countries;
var topo, projection, path, svg, g;
var YEAR = '2020-01-01';
var DEFAULT_COLOR_START = "white"
var DEFAULT_COLOR_END = "DarkRed"
// var selected = false; DONT THINK WE NEED THIS ANYMORE?
// {name: , medals: }
var confirmedCount;

var deadCount;

/*
    Draw the color picker and generate
    its functionality
*/
drawColorPicker();

/*
    zoom feature and setting up the window/map
*/

var zoom = d3.zoom()
    .scaleExtent([1, 9])
    .on("zoom", move);

var c = document.getElementById('container');
var width = c.offsetWidth;
var height = width / 2;
//Projections（投影）

function setup(width, height) {
    projection = d3.geoMercator()
        .translate([(width / 2), (height / 2)])
        .scale(width / 2 / Math.PI);
    //projection.scale() // 返回投影的比例尺。
    //projection.translate(point) // 如果point 点指定了，则设置投影转变的位移为指定的二元数组[x, y]并返回的投影。如果未指定点，则返回当前变换的位移，默认为[480, 250]。变换的位移确定投影的中心像素坐标。默认转换位移的位置是⟨0°,0°⟩，在一个960×500区域的中心。

    path = d3.geoPath().projection(projection);
//path.projection() //设置地理投影。

    svg = d3.select("#container").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom)
        .append("g");

    g = svg.append("g")
        .on("click", click);

}

/*
    Read in world.topojson
    Read in olympics.csv
    Ready function handles data processing
*/
Promise.all([
    d3.json("topojson/world-topo-min.json"),
    d3.csv("data/full_data.csv")
]).then(ready).catch(handleError)

/*
    Draws the legend
*/
function displayLegend(color) {

    var w = 300,
        h = 50;

    var key = d3.select("#legend")
        .append("svg")
        .attr("width", w)
        .attr("height", h);

    var legend = key.append("defs")
        .append("svg:linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "100%")
        .attr("y2", "100%")
        .attr("spreadMethod", "pad");

    legend.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f7fcf0")
        .attr("stop-opacity", 1);

    legend.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color)
        .attr("stop-opacity", 1);

    key.append("rect")
        .attr("width", w - 50)
        .attr("height", h - 30)
        .style("fill", "url(#gradient)")
        .style("z-index", 9999)
        .attr("transform", "translate(0,10)");

    key.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(0,30)")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("");

    // Text Anchored to the front of legend
    key.append("text")
        .attr("class", "legendTitle")
        .attr("x", 0)
        .attr("y", 15)
        .attr("transform", "translate(0,30)")
        .style("text-anchor", "left")
        .text("Least Medals");

    // Text Anchored to the end of legend
    key.append("text")
        .attr("class", "legendTitle")
        .attr("x", 250)
        .attr("y", 15)
        .attr("transform", "translate(0,30)")
        .style("text-anchor", "end")
        .text("Most Medals");

}

function filterData(year) {
    /*
		Filter the olympic data to include only data
		for the selected year
    */

    filtered_covid_data = covid_data.filter(function (obj) {
        //console.log(year);
        //console.log(obj.date.substring(0,10));
        //console.log(obj.date);

        return (obj.date == year);
    });
}

/* DONT THINK WE NEED THIS ANYMORE?
function isSelected() {
    selected = true;
}
*/

function printMap() {

    setup(width, height);

    filterData(YEAR)

    var countryMedals = [];
    var keys = Object.keys(covid_data[0])



    // initialize the medal winners to the first country
    most_confirmedCount_country = {
        name: covid_data[0].location,
        medals: +covid_data[0].total_cases
    }

    deadCount = {
        name: covid_data[0].location,
        medals: +covid_data[0].total_deaths
    }



    filtered_covid_data.forEach(element => {
        var medalCount = 0;
        for (var key of keys) {
            switch (key) {
                case 'total_cases':
                    medalCount += +element[key];
                    if (+element[key] > most_confirmedCount_country.medals)
                        most_confirmedCount_country = {
                            name: element.location,
                            medals: +element[key]
                        }
                    break;

            }

        }

        countryMedals.push(medalCount);
        medalCount = 0;
    });


    /*
        Update medal winners list
    */
    $("#confirmedCount-medal-country-text").text(most_confirmedCount_country.name + ": " + most_confirmedCount_country.medals);


    /*
        Create the color scale using the min and max
        of the total medal counts for the filtered
        olympic data
    */
    var colorScale = d3.scaleLinear()
        .range([DEFAULT_COLOR_START, DEFAULT_COLOR_END])
        .domain([0, Math.max(...countryMedals)]);


//[Math.min(...countryMedals)
    /*
        Add a path for each country
        Shapes -> path
    */
    g.selectAll(".country")
        .data(countries)
        .enter().append("path")
        .attr("class", "country")
        .attr("d", path)
        .style("fill", function (d) {
            /*
                Get the total medal count for a
                country and assign it the correct color
                based on the color scale
            */
            var medalCount = 0;
            var keys = Object.keys(covid_data[0])

            filtered_covid_data.forEach(element => {
                if (element.location == d.properties.name) {
                    for (var key of keys) {
                        switch (key) {
                            case 'total_cases':
                                medalCount += +element[key];
                                break;
                            case 'total_deaths':
                                medalCount += +element[key];
                                break;
                        }
                    }
                }
            });
            return colorScale(medalCount);
        })
        .on("mouseover", function (data) {
            d3.select(this).classed("selected", true)

            /*
                the topojson file has the country names
                of each state in the properties
            */
            country_name = data.properties.name;

            /*
                This string interpretation of the html
                that will be appended to the tooltip
            */
            var html = ""

            /*
                we can iterate over the same keys for each object
                since all objects contain the same keys
            */
            var keys = Object.keys(covid_data[0])

            /*
                if we found a country for the current year
            */
            var country_not_found = true;

            /*
                iterate through each country in olympics csv
                and check if the country is the same as the
                the current country and current year selected
            */

            filtered_covid_data.forEach(element => {


                if (element.location == country_name) {
                    for (var key of keys) {
                        html += "<div class=\"tooltip_kv\">";
                        html += "<span class='tooltip_key'>";
                        html += key + ": "
                        html += "</span>";
                        html += "<span class=\"tooltip_value\">";
                        html += element[key]
                        html += "";
                        html += "</span>";
                        html += "</div>";
                    }
                    country_not_found = false;
                }
            });

            /*
                We found no current country for this year
                so we only know the date and country name
                default the gold, silver, bronze to 0
            */
            if (country_not_found) {
                for (var key of keys) {
                    html += "<div class=\"tooltip_kv\">";
                    html += "<span class='tooltip_key'>";
                    html += key + ": "
                    html += "</span>";
                    html += "<span class=\"tooltip_value\">";
                    switch (key) {
                        case 'location':
                            html += country_name
                            break
                        case 'date':
                            html += YEAR
                            break
                        default:
                            html += 0
                            break;
                    }

                    html += "";
                    html += "</span>";
                    html += "</div>";
                }
            }

            displayToolTip(html);
            translateToolbox()
        })
        .on("mouseout", function (data) {
            // remove the css class selected to this object to remove color
            d3.select(this).classed("selected", false)
            $("#tooltip-container").hide();
        })
}


/*
    Handle processing
    data[0] = world.json data
    data[1] = olympics.csv data
*/
function ready(data) {
    /*
        Intializes global data variables
    */
    country_data = data[0]
    covid_data = data[1]
    //console.log(covid_data);



    /*
        Creates map for filtering drop down menu options
    */
    var map = d3.map();

    /*
        Filters unique values for drop down menu
    */
    covid_data.forEach(function (d) {

        if (!map.has(d.date)) {
            map.set(d.date, [d.location])
        } else {
            map.get(d.date).push(d.location);
        }
    });

    /*
        Displays the year selector
    */
    var year_option_select = d3.select('#dropdown-menu').append("select").attr("class", "year-option-select");

    year_option_select.selectAll("option")
        .data(map.keys())
        .enter()
        .append("option")
        .attr("value", function (d) {
            return d;
        })
        .text(function (d) {
            return d;
        });


    /*
        topojson.feature converts our RAW geo data into
        USEABLE geo data. Always pass it data, then
        data.objcets.__something__ then get .features out
        of it.
    */
    countries = topojson.feature(country_data, country_data.objects.countries).features

    /*
		Filter the olympic data to include only data
		for the selected year
    */
    filterData(YEAR);

    /*
        draw default map
    */
    d3.select(window).on("resize", throttle(YEAR));

    /*
        Add initial legend
    */
    displayLegend(DEFAULT_COLOR_END);

    year_option_select.on("change", function () {
        /*
            The menu has been changed, now grab the year from the drop down menu
        selected = true;
            DONT THINK WE NEED THIS ANYMORE?
        */

        /*
            Redraw the map with the selected year
        */
        YEAR = $("#dropdown-menu").find(".year-option-select").val()

        redraw(YEAR);
    });
}

/*
    Handle error
*/
function handleError(data) {}

/*
    Redraws the map after the drop down menu is changed
*/
function redraw(year) {
    d3.selectAll('svg').remove();
    printMap(year);

    /*
        Update Legend
    */
    d3.select("#legend").select("svg").remove();
    displayLegend(DEFAULT_COLOR_END);
}

/*
    Translate the tooltip to where we hover
*/
function translateToolbox() {
    if (d3.event.layerX < width / 2) {
        d3.select("#tooltip-container")
            .style("top", (d3.event.layerY + 15) + "px")
            .style("left", (d3.event.layerX + 15) + "px");
    } else {
        var tooltip_width = $("#tooltip-container").width();
        d3.select("#tooltip-container")
            .style("top", (d3.event.layerY + 15) + "px")
            .style("left", (d3.event.layerX - tooltip_width - 30) +
                "px");
    }
}


/*
	Display the tooltip with the generated html
*/
function displayToolTip(html) {
    $("#tooltip-container").html(html);
    $("#tooltip-container").show();
}

/*
    Generate the color picker
*/
function drawColorPicker() {
    var bCanPreview = true; // can preview
    // create canvas and context objects
    var canvas = document.getElementById('picker');

    var ctx = canvas.getContext('2d');
    // drawing active image
    var image = new Image();
    image.onload = function () {
        ctx.drawImage(image, 0, 0, image.width, image.height); // draw the image on the canvas
    }
    // select desired colorwheel

    var imageSrc = 'images/colorwheel.png';

    image.src = imageSrc;
    $('.preview').css('backgroundColor', DEFAULT_COLOR_END);
    $('#picker').mousemove(function (e) { // mouse move handler
        if (bCanPreview) {
            // get coordinates of current position
            var canvasOffset = $(canvas).offset();
            var canvasX = Math.floor(e.pageX - canvasOffset.left);
            var canvasY = Math.floor(e.pageY - canvasOffset.top);
            // get current pixel
            var imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
            var pixel = imageData.data;
            // update preview color
            var pixelColor = "rgb(" + pixel[0] + ", " + pixel[1] + ", " + pixel[2] + ")";

            $('.preview').css('backgroundColor', pixelColor);
            // update controls
            $('#rVal').val(pixel[0]);
            $('#gVal').val(pixel[1]);
            $('#bVal').val(pixel[2]);
            $('#rgbVal').val(pixel[0] + ',' + pixel[1] + ',' + pixel[2]);
            var dColor = pixel[2] + 256 * pixel[1] + 65536 * pixel[0];
            $('#hexVal').val('#' + ('0000' + dColor.toString(16)).substr(-6));
        }
    });
    $('#picker').click(function (e) { // click event handler
        bCanPreview = !bCanPreview;
        // get coordinates of current position
        var canvasOffset = $(canvas).offset();
        var canvasX = Math.floor(e.pageX - canvasOffset.left);
        var canvasY = Math.floor(e.pageY - canvasOffset.top);
        // get current pixel
        var imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
        var pixel = imageData.data;
        // update preview color
        var pixelColor = "rgb(" + pixel[0] + ", " + pixel[1] + ", " + pixel[2] + ")";
        var dColor = pixel[2] + 256 * pixel[1] + 65536 * pixel[0];
        $('#hexVal').val('#' + ('0000' + dColor.toString(16)).substr(-6));
        DEFAULT_COLOR_END = $('#hexVal').val()
        $('.colorpicker').hide()
        redraw();
    });
    $('.preview').click(function (e) { // preview click
        $('.colorpicker').toggle("slow", "linear");
        bCanPreview = true;
    });
}

var throttleTimer;

function throttle(desired_year) {
    window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function () {
        redraw(desired_year);
    }, 200);
}

function move() {

    var t = [d3.event.transform.x, d3.event.transform.y];
    var s = d3.event.transform.k;
    zscale = s;
    var h = height / 4;

    t[0] = Math.min(
        (width / height) * (s - 1),
        Math.max(width * (1 - s), t[0])
    );

    t[1] = Math.min(
        h * (s - 1) + h * s,
        Math.max(height * (1 - s) - h * s, t[1])
    );

    g.attr("transform", "translate(" + t + ")scale(" + s + ")");

}

function click() {
    var latlon = projection.invert(d3.mouse(this));
    console.log(latlon);
}
